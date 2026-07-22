import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeDevice, Employee } from '@app/entities';

/**
 * FE đọc `code` để hiện đúng màn hình. Không bắt FE so khớp chuỗi tiếng
 * Việt — đổi câu chữ một lần là FE hỏng im lặng.
 */
export const MA_LOI_THIET_BI = {
  CHO_DUYET: 'THIET_BI_CHO_DUYET',
  CHUA_DUOC_PHEP: 'THIET_BI_CHUA_DUOC_PHEP',
  BI_TU_CHOI: 'THIET_BI_BI_TU_CHOI',
  BI_THU_HOI: 'THIET_BI_BI_THU_HOI',
} as const;

export interface ThietBiFilter {
  trangThai?: string;
  employeeId?: string;
}

@Injectable()
export class ThietBiChamCong_Service {
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
   * Thiết bị lạ sẽ TỰ tạo dòng cho_duyet — nhân viên không phải đi tìm
   * chỗ nộp đơn, và HR thấy ngay hàng chờ.
   */
  async kiemTraThietBi(
    emp: Employee,
    deviceId: string,
    userAgent?: string,
    tenThietBi?: string,
  ): Promise<void> {
    if (!deviceId) {
      this.nem(
        MA_LOI_THIET_BI.CHUA_DUOC_PHEP,
        'Thiếu định danh thiết bị, không thể chấm công',
      );
    }

    const employeeId = String((emp as any)._id);
    const dsCuaNv = await this.repo.find({
      where: { employeeId, isActive: true },
    });

    const dong = dsCuaNv.find((d) => d.deviceId === deviceId);

    if (dong?.trangThai === 'da_duyet') return;

    if (dong?.trangThai === 'cho_duyet') {
      this.nem(
        MA_LOI_THIET_BI.CHO_DUYET,
        'Thiết bị đang chờ HR duyệt. Liên hệ HR để được kích hoạt.',
      );
    }

    if (dong?.trangThai === 'tu_choi') {
      this.nem(
        MA_LOI_THIET_BI.BI_TU_CHOI,
        'Thiết bị này đã bị từ chối. Liên hệ HR.',
      );
    }

    if (dong?.trangThai === 'thu_hoi') {
      this.nem(
        MA_LOI_THIET_BI.BI_THU_HOI,
        'Thiết bị này đã bị thu hồi. Liên hệ HR nếu cần dùng lại.',
      );
    }

    // Chưa từng thấy deviceId này → ghi nhận vào hàng chờ.
    await this.repo.save(
      this.repo.create({
        employeeId,
        employeeName: emp.hoTen,
        employeeCode: emp.employeeId,
        deviceId,
        tenThietBi,
        userAgent,
        trangThai: 'cho_duyet',
        lanDauDangKy: new Date().toISOString(),
        isActive: true,
      } as Partial<EmployeeDevice>),
    );

    const daCoMayKhac = dsCuaNv.some((d) => d.trangThai === 'da_duyet');
    if (daCoMayKhac) {
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

  async findOne(id: string): Promise<EmployeeDevice> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy thiết bị với ID ${id}`);
    }
    return item;
  }

  /**
   * Duyệt máy mới đồng thời thu hồi máy cũ — luật là 1 NV = 1 máy, nên
   * hai việc này phải đi cùng nhau, không tách thành hai thao tác HR.
   */
  async duyet(id: string, nguoiDuyet: string): Promise<EmployeeDevice> {
    const item = await this.findOne(id);

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
