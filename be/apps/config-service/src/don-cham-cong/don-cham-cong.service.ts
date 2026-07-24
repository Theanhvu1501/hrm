import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRequest, Employee } from '@app/entities';
import { CreateDonChamCongDto, UpdateDonChamCongDto } from './dto';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import { suyHeSoOt, tinhSoGioOt, tinhSoNgayNghi } from './luat-don';

// Khoảng nghỉ vượt quá ngần này thì từ chối luôn thay vì âm thầm quét hàng
// nghìn ngày lễ — một đơn nghỉ nhiều ngày là chuyện thường, nhưng vài chục
// ngày đến vài năm là bất thường, gần chắc là lỗi nhập liệu.
const GIOI_HAN_NGAY_NGHI = 60;

/**
 * Mã lỗi Task 4 — vá lỗ hổng phân quyền đơn từ. FE đọc `code` để hiện đúng
 * thông báo, không so khớp chuỗi tiếng Việt (đổi câu chữ một lần là FE hỏng
 * im lặng) — cùng quy ước với `MA_LOI_THIET_BI` ở thiet-bi-cham-cong.service.ts.
 */
export const MA_LOI_DON_CHAM_CONG = {
  /**
   * Người bấm duyệt/từ chối trùng với chủ đơn (so theo `userId` của hồ sơ
   * nhân viên, KHÔNG theo permission/vaiTro) — một mình vừa nộp vừa duyệt
   * khiến bước phê duyệt trở thành hình thức.
   */
  KHONG_TU_DUYET_DON: 'KHONG_TU_DUYET_DON',
  /** Tự huỷ đơn KHÔNG đứng tên mình. */
  KHONG_PHAI_DON_CUA_MINH: 'KHONG_PHAI_DON_CUA_MINH',
  /** Tự huỷ đơn đã da_duyet/tu_choi — quyết định đã có hiệu lực, không cho xoá dấu vết. */
  DON_DA_XU_LY_KHONG_THE_HUY: 'DON_DA_XU_LY_KHONG_THE_HUY',
} as const;

export interface DonChamCongFilter {
  employeeId?: string;
  loaiDon?: string;
  trangThai?: string;
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

@Injectable()
export class DonChamCong_Service {
  constructor(
    @InjectRepository(AttendanceRequest)
    private readonly repo: Repository<AttendanceRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly ngayLeService: NgayLe_Service,
  ) {}

  private async findEmployee(employeeId: string): Promise<Employee> {
    const { ObjectId } = await import('mongodb');
    const emp = await this.employeeRepo.findOne({
      where: { _id: new ObjectId(employeeId) as any },
    });

    if (!emp) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    return emp;
  }

  /** 0=CN…6=T7, đọc trên trục UTC thuần — cùng quy ước với luat-don.ts. */
  private ngayThanhMocUTC(ngay: string): number {
    const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
    return Date.UTC(nam, thang - 1, ngayTrongThang);
  }

  /** Danh sách "YYYY-MM-DD" từ tuNgay đến denNgay (tính cả hai đầu). */
  private cacNgayTrongKhoang(tuNgay: string, denNgay: string): string[] {
    const moc = this.ngayThanhMocUTC(tuNgay);
    const mocDen = this.ngayThanhMocUTC(denNgay);
    const hai = (n: number) => String(n).padStart(2, '0');

    const ds: string[] = [];
    for (let t = moc; t <= mocDen; t += 24 * 60 * 60 * 1000) {
      const d = new Date(t);
      ds.push(`${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}-${hai(d.getUTCDate())}`);
    }
    return ds;
  }

  /**
   * Hỏi NgayLe_Service từng ngày trong khoảng nghỉ để lấy danh sách ngày lễ
   * cần loại khỏi soNgayNghi. N truy vấn (một cho mỗi ngày) chấp nhận được vì
   * đã chặn khoảng ở GIOI_HAN_NGAY_NGHI trước khi gọi hàm này.
   */
  private async layNgayLeTrongKhoang(
    tuNgay: string,
    denNgay: string,
  ): Promise<string[]> {
    const cacNgay = this.cacNgayTrongKhoang(tuNgay, denNgay);
    const ketQua = await Promise.all(
      cacNgay.map((ngay) => this.ngayLeService.timTheoNgay(ngay)),
    );
    return cacNgay.filter((_, i) => ketQua[i] !== null);
  }

  /**
   * Tính các trường BACKEND TỰ TÍNH (soGioOt/heSoOt/loaiNgayOt cho OT,
   * soNgayNghi cho nghỉ phép) — snapshot NGAY LÚC TẠO đơn, không tính lại khi
   * đọc. Nếu tính lại lúc đọc, HR sửa lịch lễ tháng sau sẽ âm thầm đổi hệ số
   * của đơn đã nộp từ tháng trước, và không ai biết số nào mới là số đã trả
   * lương. Trả về object rời — gọi nơi tạo entity SAU khi spread `...dto`, để
   * giá trị backend tính luôn đè giá trị client gửi kèm (nếu có).
   */
  private async tinhCacTruongSnapshot(
    dto: CreateDonChamCongDto,
    emp: Employee,
  ): Promise<
    Partial<
      Pick<AttendanceRequest, 'soGioOt' | 'heSoOt' | 'loaiNgayOt' | 'soNgayNghi'>
    >
  > {
    if (dto.loaiDon === 'lam_them_gio') {
      const soGioOt = tinhSoGioOt(dto.gioTu!, dto.gioDen!);
      const ngayLe = await this.ngayLeService.timTheoNgay(dto.ngay);
      const { loaiNgayOt, heSoOt } = suyHeSoOt({
        ngay: dto.ngay,
        laNgayLe: ngayLe !== null,
        ngayLamViecTrongTuan: emp.ngayLamViecTrongTuan,
      });
      return { soGioOt, heSoOt, loaiNgayOt };
    }

    if (dto.loaiDon === 'nghi_phep' || dto.loaiDon === 'nghi_bu') {
      const tuNgay = dto.ngay;
      const denNgay = dto.denNgay ?? dto.ngay;
      const soNgayTrongKhoang = this.cacNgayTrongKhoang(tuNgay, denNgay).length;
      if (soNgayTrongKhoang > GIOI_HAN_NGAY_NGHI) {
        throw new BadRequestException(
          `Khoảng nghỉ không được vượt quá ${GIOI_HAN_NGAY_NGHI} ngày`,
        );
      }

      const ngayLeTrongKhoang = await this.layNgayLeTrongKhoang(tuNgay, denNgay);
      const soNgayNghi = tinhSoNgayNghi({
        tuNgay,
        denNgay,
        buoi: dto.buoi,
        ngayLeTrongKhoang,
        ngayLamViecTrongTuan: emp.ngayLamViecTrongTuan,
      });
      return { soNgayNghi };
    }

    // giai_trinh: không tính gì.
    return {};
  }

  async create(dto: CreateDonChamCongDto): Promise<AttendanceRequest> {
    const emp = await this.findEmployee(dto.employeeId);
    const truongTinhToan = await this.tinhCacTruongSnapshot(dto, emp);

    const entity = this.repo.create({
      ...dto,
      employeeName: emp.hoTen,
      employeeCode: emp.employeeId,
      // Task 4 (cửa thứ hai): LUÔN 'cho_duyet', bất kể dto.trangThai là gì.
      // Design spec §3 câu hỏi 7 chốt: HR được phép nộp hộ đơn cho người
      // khác, nhưng đơn vẫn phải qua một bước duyệt riêng để lại vết
      // (nguoiDuyetId/thoiDiemDuyet trong updateStatus()) — không ai được
      // "tạo thẳng ra đơn đã duyệt". Trước đây `dto.trangThai ?? 'cho_duyet'`
      // để lọt giá trị client gửi kèm, cho phép né PATCH :id/trang-thai (và
      // luật KHONG_TU_DUYET_DON trong đó) ngay từ lúc tạo.
      trangThai: 'cho_duyet',
      isActive: true,
      // Đặt SAU `...dto` — dù DTO đã cố tình không có các trường này (xem
      // CreateDonChamCongDto), việc gán tường minh ở đây đảm bảo backend luôn
      // thắng ngay cả khi pipe forbidNonWhitelisted có bị nới lỏng sau này.
      ...truongTinhToan,
    } as Partial<AttendanceRequest>);

    return this.repo.save(entity);
  }

  /**
   * Đổi trạng thái đơn — luồng DUYỆT/TỪ CHỐI (`PATCH :id/trang-thai`).
   *
   * `nguoiThucHien` LUÔN phải là `req.user` thật của người gọi (controller
   * gắn `PermissionGuard`, không phải body/query) — đây là chỗ duy nhất chặn
   * được tự duyệt: `PermissionGuard` chỉ kiểm mảng `permissions` của vai trò,
   * hoàn toàn không biết đơn đang xử lý có phải của chính người gọi hay không.
   * Người có `/cham-cong/don-tu:sua` vẫn duyệt được MỌI đơn, kể cả đơn mình
   * tự nộp — nên luật "không tự duyệt" phải nằm ở đây.
   */
  async updateStatus(
    id: string,
    trangThai: string,
    nguoiDuyet: string | undefined,
    nguoiThucHien: { id: string; [k: string]: unknown },
  ): Promise<AttendanceRequest> {
    const item = await this.findOne(id);
    const laHanhDongDuyet = trangThai === 'da_duyet' || trangThai === 'tu_choi';

    if (laHanhDongDuyet) {
      // So theo userId của HỒ SƠ NHÂN VIÊN đứng tên đơn, không so theo
      // `nguoiDuyet` (chuỗi tên hiển thị, client tự gõ, không tin cậy được).
      const chuDon = await this.findEmployee(item.employeeId);
      const idNguoiGoi = String(nguoiThucHien?.id ?? '').trim();

      if (chuDon.userId && idNguoiGoi && chuDon.userId === idNguoiGoi) {
        // Fail-closed kể cả khi người gọi có vaiTro ADMIN/quyền duyệt: quyền
        // duyệt KHÔNG đồng nghĩa được duyệt đơn của chính mình.
        throw new ForbiddenException({
          code: MA_LOI_DON_CHAM_CONG.KHONG_TU_DUYET_DON,
          message: 'Không được tự duyệt đơn của chính mình',
        });
      }
    }

    item.trangThai = trangThai;
    if (nguoiDuyet !== undefined) {
      item.nguoiDuyet = nguoiDuyet;
    }
    if (laHanhDongDuyet) {
      // Vết duyệt: ai bấm và lúc nào — chỉ ghi khi đây thực sự là hành động
      // duyệt/từ chối, không ghi đè khi trạng thái bị trả lại cho_duyet.
      item.nguoiDuyetId = String(nguoiThucHien?.id ?? '').trim() || undefined;
      item.thoiDiemDuyet = new Date().toISOString();
    }

    return this.repo.save(item);
  }

  /**
   * Tự huỷ đơn CỦA CHÍNH MÌNH — route `DELETE /don-cham-cong/cua-toi/:id`.
   * `employeeId` truyền vào PHẢI suy từ token ở controller (qua
   * `NhanVien_Service.resolveEmployeeFromUser`), không phải tham số client
   * tự khai — nếu không thì test "chặn huỷ đơn người khác" bên dưới vô nghĩa.
   *
   * Hai điều kiện, thiếu một là chặn:
   *  - đơn phải đứng tên `employeeId` của người gọi;
   *  - đơn còn `cho_duyet` — đã `da_duyet`/`tu_choi` thì không cho tự huỷ,
   *    tránh xoá dấu vết một quyết định đã có hiệu lực (vd đã tính lương).
   */
  async huyDonCuaToi(id: string, employeeId: string): Promise<void> {
    const item = await this.findOne(id);

    if (item.employeeId !== employeeId) {
      throw new ForbiddenException({
        code: MA_LOI_DON_CHAM_CONG.KHONG_PHAI_DON_CUA_MINH,
        message: 'Không thể huỷ đơn của người khác',
      });
    }

    if (item.trangThai !== 'cho_duyet') {
      throw new ForbiddenException({
        code: MA_LOI_DON_CHAM_CONG.DON_DA_XU_LY_KHONG_THE_HUY,
        message: 'Chỉ có thể tự huỷ đơn đang ở trạng thái chờ duyệt',
      });
    }

    item.isActive = false;
    await this.repo.save(item);
  }

  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(filter?: DonChamCongFilter): Promise<AttendanceRequest[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.loaiDon) where.loaiDon = filter.loaiDon;
    if (filter?.trangThai) where.trangThai = filter.trangThai;

    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<AttendanceRequest> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy đơn chấm công với ID ${id}`);
    }

    return item;
  }

  /**
   * Task 4 (đóng "cửa thứ hai"): PUT :id KHÔNG ĐƯỢC PHÉP đổi trangThai dưới
   * bất kỳ hình thức nào — trạng thái đơn CHỈ được di chuyển qua
   * `updateStatus()` (route `PATCH :id/trang-thai`), nơi duy nhất kiểm luật
   * KHONG_TU_DUYET_DON và ghi vết nguoiDuyetId/thoiDiemDuyet. Trước đây
   * `Object.assign(item, dto)` ghi thẳng mọi trường của dto — kể cả
   * `trangThai` — xuống entity rồi lưu, nên một ADMIN đồng thời là chủ đơn
   * gọi PUT với `{ trangThai: 'da_duyet' }` tự duyệt được đơn của chính
   * mình, né hoàn toàn luật vừa vá ở updateStatus(). Một cánh cửa khoá kỹ mà
   * còn cửa thứ hai không khoá thì coi như không khoá.
   *
   * Cách vá phải mang tính CẤU TRÚC, không phải "nếu có thì xoá": tách hẳn
   * `trangThai` ra khỏi dto bằng destructuring trước khi merge vào entity —
   * biến `_trangThaiBiBoQua` không được dùng ở đâu khác, nên trường này về
   * mặt code không có đường nào chạm tới `repo.save` từ nhánh update(). Nếu
   * sau này ai thêm trường tự tính khác cần cùng cách xử lý, làm y hệt ở
   * đây thay vì thêm điều kiện rẽ nhánh dễ quên.
   *
   * vòng sửa 2 (task-4-fix2): cửa thứ hai chưa đóng hết — `employeeId` cũng
   * phải bóc ra cùng chỗ. Luật KHONG_TU_DUYET_DON đọc chủ đơn TẠI THỜI ĐIỂM
   * DUYỆT (`findEmployee(item.employeeId)` trong `updateStatus()`), nên nếu
   * PUT còn sửa được `employeeId`, chủ đơn trở thành một đầu vào có thể thao
   * túng của chính luật đó: đổi đơn sang tên đồng nghiệp → nhờ duyệt (hoặc tự
   * duyệt vì đã không còn là "chính mình") → đổi employeeId về lại tên mình —
   * ba bước này đi vòng hoàn toàn qua luật chặn tự duyệt mà không route nào
   * phát hiện, vì luật chỉ kiểm tra đúng một lần lúc PATCH :id/trang-thai.
   * Chủ đơn được chốt lúc tạo (`create()`); muốn đổi người đứng tên thì huỷ
   * đơn và tạo đơn mới, không sửa qua PUT.
   *
   * `nguoiDuyet` (tên hiển thị) bóc ra cùng lý do: nửa đáng tin của vết duyệt
   * là `nguoiDuyetId`, chỉ `updateStatus()` được ghi. Nếu PUT ghi được nửa
   * còn lại (`nguoiDuyet`) một cách độc lập, tên hiển thị FE đọc và id soát
   * vết có thể lệch nhau mà không có dấu hiệu gì.
   */
  async update(
    id: string,
    dto: UpdateDonChamCongDto,
  ): Promise<AttendanceRequest> {
    const item = await this.findOne(id);
    const {
      trangThai: _trangThaiBiBoQua,
      employeeId: _employeeIdBiBoQua,
      nguoiDuyet: _nguoiDuyetBiBoQua,
      ...phanConLaiDuocPhepSua
    } = dto;
    Object.assign(item, phanConLaiDuocPhepSua);
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
