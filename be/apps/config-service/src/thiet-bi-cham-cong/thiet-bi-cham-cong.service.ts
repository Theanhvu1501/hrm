import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeDevice, Employee } from '@app/entities';

/**
 * FE đọc `code` để hiện đúng màn hình. Không bắt FE so khớp chuỗi tiếng
 * Việt — đổi câu chữ một lần là FE hỏng im lặng.
 *
 * 4 mã đầu là hợp đồng đã có với FE, KHÔNG được đổi giá trị chuỗi.
 */
export const MA_LOI_THIET_BI = {
  CHO_DUYET: 'THIET_BI_CHO_DUYET',
  CHUA_DUOC_PHEP: 'THIET_BI_CHUA_DUOC_PHEP',
  BI_TU_CHOI: 'THIET_BI_BI_TU_CHOI',
  BI_THU_HOI: 'THIET_BI_BI_THU_HOI',
  /**
   * Request không kèm định danh thiết bị (hoặc định danh rác). Tách khỏi
   * CHUA_DUOC_PHEP vì lúc này KHÔNG có yêu cầu nào được gửi cho HR — hiện
   * "đã gửi HR duyệt" là nói dối người dùng.
   */
  THIEU_DINH_DANH: 'THIET_BI_THIEU_DINH_DANH',
  /**
   * Dữ liệu tự mâu thuẫn (vd 1 nhân viên có >1 máy `da_duyet`). Fail-closed:
   * chặn chấm công cho tới khi HR dọn dữ liệu.
   */
  DU_LIEU_BAT_NHAT: 'THIET_BI_DU_LIEU_BAT_NHAT',
  /**
   * Trạng thái nằm ngoài 4 giá trị hợp lệ (dữ liệu import/migration, hoặc
   * trạng thái mới do task sau thêm mà quên cập nhật cổng kiểm tra này).
   */
  TRANG_THAI_KHONG_HOP_LE: 'THIET_BI_TRANG_THAI_KHONG_HOP_LE',
} as const;

/** 4 trạng thái hợp lệ duy nhất của một dòng `employee_devices`. */
export const TRANG_THAI_THIET_BI = [
  'cho_duyet',
  'da_duyet',
  'tu_choi',
  'thu_hoi',
] as const;

/**
 * `deviceId` do client sinh (UUID v4 trong localStorage → 36 ký tự). Ngưỡng
 * này CHỈ để loại chuỗi rỗng/khoảng trắng/rác, cố ý đặt thấp vì backend
 * không thể — và không nên giả vờ — xác thực định dạng của một định danh do
 * client tự khai. Muốn siết định dạng thì phải siết ở chỗ khác (vd bắt buộc
 * UUID v4), không phải bằng cách nâng con số này.
 */
export const DO_DAI_DEVICE_ID_TOI_THIEU = 4;

export interface ThietBiFilter {
  trangThai?: string;
  employeeId?: string;
}

@Injectable()
export class ThietBiChamCong_Service {
  private readonly logger = new Logger(ThietBiChamCong_Service.name);

  constructor(
    @InjectRepository(EmployeeDevice)
    private readonly repo: Repository<EmployeeDevice>,
  ) {}

  private nem(code: string, message: string): never {
    throw new ForbiddenException({ code, message });
  }

  /**
   * Cổng chống chấm hộ. Trả về void nếu thiết bị hợp lệ, ném
   * ForbiddenException kèm `code` nếu không.
   *
   * Nguyên tắc: **fail-closed, trạng thái xấu nhất thắng**. Một `deviceId`
   * có thể ứng với nhiều dòng (import, race đăng ký, dữ liệu cũ) nên không
   * được lấy `.find()` dòng đầu tiên — thứ tự Mongo trả về là ngẫu nhiên,
   * quyết định bảo mật sẽ thành không xác định. Chỉ cần tồn tại MỘT dòng
   * `tu_choi`/`thu_hoi` cho `deviceId` đó là chặn, bất kể có dòng
   * `da_duyet` nào khác.
   *
   * Thiết bị lạ sẽ TỰ tạo dòng cho_duyet — nhân viên không phải đi tìm
   * chỗ nộp đơn, và HR thấy ngay hàng chờ.
   */
  async kiemTraThietBi(
    emp: Employee,
    deviceId: string,
    userAgent?: string,
    tenThietBi?: string,
  ): Promise<void> {
    const dinhDanh = String(deviceId ?? '').trim();
    if (dinhDanh.length < DO_DAI_DEVICE_ID_TOI_THIEU) {
      this.nem(
        MA_LOI_THIET_BI.THIEU_DINH_DANH,
        'Thiếu định danh thiết bị hợp lệ, không thể chấm công. Vui lòng tải lại trang rồi thử lại.',
      );
    }

    const employeeId = String((emp as any)._id);
    const dsCuaNv = await this.repo.find({
      where: { employeeId, isActive: true },
    });

    // Bất biến "1 nhân viên = 1 máy" phải được kiểm ở ĐƯỜNG ĐỌC, không chỉ
    // ép lúc `duyet()`. Nếu dữ liệu đã lệch thì cả hai máy đều chấm được —
    // đúng thứ cơ chế này sinh ra để chặn.
    const dsDaDuyet = dsCuaNv.filter((d) => d.trangThai === 'da_duyet');
    if (dsDaDuyet.length > 1) {
      this.logger.warn(
        `Nhân viên ${employeeId} (${emp.employeeId ?? '—'}) có ${dsDaDuyet.length} thiết bị da_duyet cùng lúc: ` +
          dsDaDuyet.map((d) => `${String((d as any)._id)}/${d.deviceId}`).join(', '),
      );
      this.nem(
        MA_LOI_THIET_BI.DU_LIEU_BAT_NHAT,
        'Dữ liệu thiết bị của bạn đang bất nhất (nhiều hơn một thiết bị được duyệt). Liên hệ HR để xử lý trước khi chấm công.',
      );
    }

    const dsKhop = dsCuaNv.filter((d) => d.deviceId === dinhDanh);

    if (dsKhop.some((d) => d.trangThai === 'tu_choi')) {
      this.nem(
        MA_LOI_THIET_BI.BI_TU_CHOI,
        'Thiết bị này đã bị từ chối. Liên hệ HR.',
      );
    }

    if (dsKhop.some((d) => d.trangThai === 'thu_hoi')) {
      this.nem(
        MA_LOI_THIET_BI.BI_THU_HOI,
        'Thiết bị này đã bị thu hồi. Liên hệ HR nếu cần dùng lại.',
      );
    }

    const dsChoDuyet = dsKhop.filter((d) => d.trangThai === 'cho_duyet');
    if (dsChoDuyet.length > 0) {
      // Nhân viên đặt lại tên máy từ màn hình "Chấm công của tôi" thì ghi đè
      // tên trên dòng đang chờ.
      //
      // Không có bước này thì ô đặt tên ở FE là vô nghĩa: dòng `cho_duyet`
      // được TỰ tạo ở nhánh dưới ngay lần chấm công đầu tiên — tức trước khi
      // người dùng kịp nhìn thấy màn hình nào để nhập tên — nên mọi lần gửi
      // sau đó đều rơi đúng vào đây và tên bị vứt đi im lặng. HR mở hàng chờ
      // ra chỉ thấy một UUID không biết của ai.
      //
      // Không mở thêm quyền gì: `dsCuaNv` đã lọc theo employeeId nên chỉ sửa
      // được dòng của chính mình, và chỉ khi dòng đó đang `cho_duyet` —
      // không đụng tới `da_duyet`/`tu_choi`/`thu_hoi`, không đổi `trangThai`.
      const tenMoi = String(tenThietBi ?? '').trim();
      if (tenMoi) {
        for (const d of dsChoDuyet) {
          if (d.tenThietBi === tenMoi) continue;
          d.tenThietBi = tenMoi;
          await this.repo.save(d);
        }
      }

      this.nem(
        MA_LOI_THIET_BI.CHO_DUYET,
        'Thiết bị đang chờ HR duyệt. Liên hệ HR để được kích hoạt.',
      );
    }

    if (dsKhop.some((d) => d.trangThai === 'da_duyet')) return;

    // Có dòng khớp deviceId nhưng KHÔNG dòng nào mang trạng thái hợp lệ.
    // Tuyệt đối không rơi xuống nhánh tạo dòng mới: mỗi lần chấm công sẽ đẻ
    // thêm một dòng cho_duyet trùng deviceId, vừa phình hàng chờ HR vừa tự
    // tạo ra đúng điều kiện dữ liệu bất nhất ở trên.
    const dsLaTrangThai = dsKhop.filter(
      (d) => !(TRANG_THAI_THIET_BI as readonly string[]).includes(d.trangThai),
    );
    if (dsLaTrangThai.length > 0) {
      this.logger.warn(
        `Thiết bị ${dinhDanh} của nhân viên ${employeeId} có trạng thái ngoài tập hợp lệ: ` +
          dsLaTrangThai
            .map((d) => `${String((d as any)._id)}=${String(d.trangThai)}`)
            .join(', '),
      );
      this.nem(
        MA_LOI_THIET_BI.TRANG_THAI_KHONG_HOP_LE,
        'Trạng thái thiết bị không hợp lệ. Liên hệ HR để kiểm tra lại đăng ký thiết bị.',
      );
    }

    // Chưa từng thấy deviceId này → ghi nhận vào hàng chờ.
    await this.repo.save(
      this.repo.create({
        employeeId,
        employeeName: emp.hoTen,
        employeeCode: emp.employeeId,
        deviceId: dinhDanh,
        tenThietBi,
        userAgent,
        trangThai: 'cho_duyet',
        lanDauDangKy: new Date().toISOString(),
        isActive: true,
      } as Partial<EmployeeDevice>),
    );

    if (dsDaDuyet.length > 0) {
      this.nem(
        MA_LOI_THIET_BI.CHUA_DUOC_PHEP,
        'Thiết bị này chưa được phép chấm công. Yêu cầu đã gửi HR duyệt.',
      );
    }

    this.nem(
      MA_LOI_THIET_BI.CHO_DUYET,
      'Thiết bị đã gửi HR duyệt. Vui lòng chờ HR kích hoạt.',
    );
  }

  async findAll(filter?: ThietBiFilter): Promise<EmployeeDevice[]> {
    const where: Record<string, any> = { isActive: true };
    if (filter?.trangThai) where.trangThai = filter.trangThai;
    if (filter?.employeeId) where.employeeId = filter.employeeId;
    return this.repo.find({ where });
  }

  async cuaToi(emp: Employee): Promise<EmployeeDevice[]> {
    return this.repo.find({
      where: { employeeId: String((emp as any)._id), isActive: true },
    });
  }

  /**
   * Lọc `isActive` cho đồng bộ với `kiemTraThietBi`/`findAll`: nếu HR thao
   * tác được trên một dòng đã `isActive: false` thì `duyet()` sẽ thu hồi máy
   * đang dùng, còn máy vừa "duyệt" lại bị `kiemTraThietBi` bỏ qua — nhân
   * viên mất sạch đường chấm công.
   */
  async findOne(id: string): Promise<EmployeeDevice> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any, isActive: true },
    });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy thiết bị với ID ${id}`);
    }
    return item;
  }

  /**
   * Duyệt máy mới đồng thời thu hồi máy cũ — luật là 1 NV = 1 máy, nên
   * hai việc này phải đi cùng nhau, không tách thành hai thao tác HR.
   *
   * CHỈ nhận dòng đang `cho_duyet`: cho phép duyệt một dòng `thu_hoi`/
   * `tu_choi` là hồi sinh thẳng thiết bị vừa bị khoá vì chấm hộ, chỉ bằng
   * một request và không để lại dấu vết nào ngoài `lanDuyet`.
   */
  async duyet(id: string, nguoiDuyet: string): Promise<EmployeeDevice> {
    const item = await this.findOne(id);

    if (item.trangThai !== 'cho_duyet') {
      this.nem(
        MA_LOI_THIET_BI.TRANG_THAI_KHONG_HOP_LE,
        `Chỉ duyệt được thiết bị đang chờ duyệt. Thiết bị này đang ở trạng thái "${item.trangThai}"; yêu cầu nhân viên đăng ký lại thiết bị từ đầu.`,
      );
    }

    const dsCuaNv = await this.repo.find({
      where: { employeeId: item.employeeId, isActive: true },
    });

    for (const cu of dsCuaNv) {
      if (cu.trangThai !== 'da_duyet') continue;
      if (cu.deviceId === item.deviceId) continue;
      cu.trangThai = 'thu_hoi';
      cu.lyDoThuHoi = 'Tự động thu hồi khi duyệt thiết bị mới';
      await this.repo.save(cu);
    }

    item.trangThai = 'da_duyet';
    item.nguoiDuyet = nguoiDuyet;
    item.lanDuyet = new Date().toISOString();
    return this.repo.save(item);
  }

  /**
   * Chỉ đổi đúng dòng được chỉ định. CỐ Ý không đụng tới máy khác của nhân
   * viên: từ chối một máy lạ không được kéo theo khoá máy đang dùng hợp lệ.
   */
  async tuChoi(id: string, nguoiDuyet: string): Promise<EmployeeDevice> {
    const item = await this.findOne(id);
    item.trangThai = 'tu_choi';
    item.nguoiDuyet = nguoiDuyet;
    item.lanDuyet = new Date().toISOString();
    return this.repo.save(item);
  }

  async thuHoi(
    id: string,
    nguoiThucHien: string,
    lyDo?: string,
  ): Promise<EmployeeDevice> {
    const item = await this.findOne(id);
    item.trangThai = 'thu_hoi';
    item.nguoiDuyet = nguoiThucHien;
    item.lyDoThuHoi = lyDo;
    return this.repo.save(item);
  }
}
