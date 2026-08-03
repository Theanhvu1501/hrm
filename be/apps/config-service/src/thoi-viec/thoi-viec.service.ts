import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resignation, Employee } from '@app/entities';
import { CreateThoiViecDto, UpdateThoiViecDto } from './dto';

export interface ThoiViecFilter {
  employeeId?: string;
  trangThai?: string;
  loaiThoiViec?: string;
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

@Injectable()
export class ThoiViec_Service {
  constructor(
    @InjectRepository(Resignation)
    private readonly repo: Repository<Resignation>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
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

  async create(dto: CreateThoiViecDto): Promise<Resignation> {
    const emp = await this.findEmployee(dto.employeeId);

    const entity = this.repo.create({
      employeeId: dto.employeeId,
      employeeName: emp.hoTen,
      employeeCode: emp.employeeId,
      ngayNopDon: dto.ngayNopDon,
      ngayLamViecCuoi: dto.ngayLamViecCuoi,
      loaiThoiViec: dto.loaiThoiViec,
      lyDo: dto.lyDo,
      viPham: dto.viPham,
      checklistBanGiao: dto.checklistBanGiao,
      soQuyetDinh: dto.soQuyetDinh,
      ghiChu: dto.ghiChu,
      trangThai: 'cho_duyet',
      isActive: true,
    } as Partial<Resignation>);

    return this.repo.save(entity);
  }

  /**
   * Coerces the `isActive` filter value, which may arrive as a real boolean
   * (programmatic callers) or as the STRING "true"/"false" (HTTP query params
   * are never parsed to booleans by Nest's default query pipe). Defaults to
   * `true` when the value is absent, mirroring nhan-vien/hop-dong/qua-trinh.
   */
  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(filter?: ThoiViecFilter): Promise<Resignation[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.trangThai) where.trangThai = filter.trangThai;
    if (filter?.loaiThoiViec) where.loaiThoiViec = filter.loaiThoiViec;

    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<Resignation> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy hồ sơ thôi việc với ID ${id}`);
    }

    return item;
  }

  async update(id: string, dto: UpdateThoiViecDto): Promise<Resignation> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  /**
   * 'da_duyet'/'hoan_thanh' là hai trạng thái "có hiệu lực nghỉ việc": đây là
   * lúc `updateStatus()` đẩy Employee.trangThai sang 'da_nghi', và cũng là
   * lúc bảng công (`ngayCuoiHopLeCuaHoSo` trong bang-cong.service.ts) bắt
   * đầu tính hồ sơ vào mốc cắt ngày công. 'cho_duyet'/'tu_choi' thì không.
   */
  private coHieuLucNghiViec(trangThai: string): boolean {
    return trangThai === 'da_duyet' || trangThai === 'hoan_thanh';
  }

  /** Giá trị khôi phục cho NV khi hồ sơ thôi việc rời khỏi trạng thái hiệu lực. */
  private trangThaiKhoiPhuc(item: Resignation): string {
    return item.trangThaiNhanVienTruocKhiDuyet ?? 'dang_lam_viec';
  }

  /**
   * Xoá mềm MỘT hồ sơ thôi việc phải huỷ cả hai hiệu ứng đã áp cho nhân
   * viên khi hồ sơ đó đang có hiệu lực — không chỉ tắt `isActive`:
   *   - bảng công: lọc theo `isActive: true` nên mốc cắt ngày công tự biến
   *     mất, KHÔNG cần sửa gì thêm ở đây.
   *   - chấm công: `chanNeuDaNghiViec()` đọc `Employee.trangThai`, không
   *     đọc hồ sơ thôi việc, nên nếu không chủ động trả lại trạng thái làm
   *     việc thì NV vẫn bị chặn chấm công dù bảng công đã tính công lại
   *     bình thường cho họ — hai hệ thống lệch pha nhau.
   *
   * THỨ TỰ GHI: nhân viên TRƯỚC, `isActive=false` SAU (xem lý giải dài ở
   * `updateStatus()` — cùng một lỗi thiết kế, cùng một cách sửa). Nếu ghi
   * NV lỗi, hồ sơ vẫn còn `isActive=true` trong DB nên lần gọi lại sẽ đi
   * qua guard bên dưới và thử lại đúng phần đã lỗi — không bị coi là "đã
   * xoá rồi" và bỏ qua NV vĩnh viễn.
   *
   * Guard `!item.isActive` chặn xử lý lại khi remove() bị gọi lần hai trên
   * cùng một hồ sơ ĐÃ xoá THÀNH CÔNG: không phải vì tốn kém (save Mongo là
   * idempotent) mà vì nếu không guard, một lần gọi lại vô tình (double-
   * click, retry sau khi đã thành công) sẽ ghi ĐÈ trangThai hiện tại của NV
   * bằng giá trị chụp cũ, kể cả khi NV đã được HR chỉnh tay sang trạng thái
   * khác từ sau lần xoá đầu tiên.
   */
  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    if (!item.isActive) return;

    if (this.coHieuLucNghiViec(item.trangThai)) {
      const emp = await this.findEmployee(item.employeeId);
      emp.trangThai = this.trangThaiKhoiPhuc(item);
      // Xem lý giải "không nuốt lỗi" ở updateStatus() — áp dụng như nhau.
      await this.employeeRepo.save(emp);
    }

    item.isActive = false;
    await this.repo.save(item);
  }

  /**
   * Updates the resignation's status.
   *
   * Đi VÀO trạng thái có hiệu lực ('da_duyet'/'hoan_thanh') từ trạng thái
   * chưa có hiệu lực: chụp lại Employee.trangThai NGAY LÚC ĐÓ (để còn khôi
   * phục đúng — vd 'tam_nghi' — nếu sau này huỷ duyệt), rồi đẩy nhân viên
   * sang 'da_nghi'. Chuyển giữa hai trạng thái CÙNG có hiệu lực (da_duyet ->
   * hoan_thanh) không chụp lại — chụp lúc đó sẽ đè mất giá trị gốc bằng
   * chính 'da_nghi'.
   *
   * Đi RA khỏi trạng thái có hiệu lực (về 'tu_choi'/'cho_duyet'): khôi phục
   * Employee.trangThai về đúng giá trị đã chụp — đây là điểm sửa Gap 1 (HR
   * duyệt nhầm rồi từ chối lại vẫn phải mở lại được chấm công cho NV).
   *
   * Không đi vào/ra trạng thái có hiệu lực (vd cho_duyet -> tu_choi khi
   * chưa từng được duyệt): không đụng tới hồ sơ nhân viên.
   *
   * THỨ TỰ GHI — nhân viên TRƯỚC, hồ sơ thôi việc SAU (review round 1,
   * CRITICAL): bản đầu ghi hồ sơ trước rồi mới ghi NV. Nếu ghi NV lỗi giữa
   * chừng, hồ sơ ĐÃ đổi trạng thái trong DB, còn NV thì chưa — caller nhận
   * 5xx và làm đúng việc "retry cùng request", nhưng lần gọi lại sẽ
   * `findOne()` ra hồ sơ đã ở trạng thái ĐÍCH, khiến `dangHieuLucTruoc` và
   * `seHieuLuc` tính ra BẰNG NHAU và rơi vào nhánh no-op phía trên — không
   * còn fetch/ghi NV, không còn báo lỗi, trả 200 "thành công" trong khi NV
   * vẫn kẹt nguyên trạng thái cũ. Guard chống double-processing (nãy dùng
   * để tránh ghi đè quỹ phép/luồng khác) vô tình biến CHÍNH retry — con
   * đường phục hồi duy nhất — thành no-op vĩnh viễn.
   *
   * Ghi NV trước khắc phục: nếu bước NV lỗi, hồ sơ (biến `item` local) CHƯA
   * hề bị `save()`, nên DB vẫn giữ nguyên trạng thái cũ; lần gọi lại tính
   * lại đúng `dangHieuLucTruoc`/`seHieuLuc` như lần đầu và thử lại toàn bộ
   * thao tác — không có short-circuit. Lỗi vẫn được propagate (không nuốt),
   * chỉ đổi thứ tự để retry có ý nghĩa.
   */
  async updateStatus(id: string, trangThai: string): Promise<Resignation> {
    const item = await this.findOne(id);
    const dangHieuLucTruoc = this.coHieuLucNghiViec(item.trangThai);
    const seHieuLuc = this.coHieuLucNghiViec(trangThai);

    if (!dangHieuLucTruoc && !seHieuLuc) {
      item.trangThai = trangThai;
      return this.repo.save(item);
    }

    const emp = await this.findEmployee(item.employeeId);

    // Snapshot cần ghi vào hồ sơ — tính TRƯỚC nhưng CHƯA gán vào `item`,
    // để nếu bước ghi NV bên dưới ném lỗi thì `item` (và DB) vẫn y nguyên.
    const trangThaiNhanVienTruocKhiDuyetMoi =
      seHieuLuc && !dangHieuLucTruoc
        ? emp.trangThai
        : item.trangThaiNhanVienTruocKhiDuyet;

    emp.trangThai = seHieuLuc ? 'da_nghi' : this.trangThaiKhoiPhuc(item);
    await this.employeeRepo.save(emp);

    item.trangThai = trangThai;
    item.trangThaiNhanVienTruocKhiDuyet = trangThaiNhanVienTruocKhiDuyetMoi;
    return this.repo.save(item);
  }
}
