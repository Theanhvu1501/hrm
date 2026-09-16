import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CauHinhLuong, EmploymentHistory, Employee } from '@app/entities';
import { PhongBanService } from '../phong-ban/phong-ban.service';
import { DinhKem_Service } from '../dinh-kem/dinh-kem.service';
import { HopDong_Service } from '../hop-dong/hop-dong.service';
import { renderPhuLucDeIn } from './lib/phuLucRender';
import {
  CreateQuaTrinhCongTacDto,
  UpdateQuaTrinhCongTacDto,
} from './dto';

export interface QuaTrinhCongTacFilter {
  employeeId?: string;
  loaiThayDoi?: string;
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

@Injectable()
export class QuaTrinhCongTac_Service {
  constructor(
    @InjectRepository(EmploymentHistory)
    private readonly repo: Repository<EmploymentHistory>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly phongBanService: PhongBanService,
    private readonly dinhKem_Service: DinhKem_Service,
    private readonly hopDong_Service: HopDong_Service,
    @InjectRepository(CauHinhLuong)
    private readonly cauHinhLuongRepo: Repository<CauHinhLuong>,
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

  async create(
    dto: CreateQuaTrinhCongTacDto,
    token: string,
  ): Promise<EmploymentHistory> {
    const emp = await this.findEmployee(dto.employeeId);

    // Lịch sử điều chuyển lưu TÊN phòng tại thời điểm đó, không lưu id: đổi tên
    // hay xóa phòng về sau không được phép viết lại quá khứ.
    //
    // Chỉ gọi danh mục khi THỰC SỰ cần tra tên (nhân viên đang có phòng, hoặc
    // dto có phòng mới) — bản ghi tang_luong/bo_nhiem/doi_trang_thai/danh_gia
    // không đụng tới phòng ban thì không được phép phụ thuộc identity còn
    // sống hay không (identity lỗi = list() ném lỗi, xem PhongBanService).
    const canTraTen = Boolean(emp.departmentId) || Boolean(dto.departmentIdMoi);
    const danhMuc = canTraTen ? await this.phongBanService.list(token) : [];
    const tenCua = (id?: string | null) =>
      id ? (danhMuc.find((d) => d.id === id)?.tenPhong ?? null) : undefined;

    const phongBanCu = tenCua(emp.departmentId);
    const phongBanMoi = tenCua(dto.departmentIdMoi);

    // Yêu cầu d13: "Số quyết định bổ nhiệm: cho up kèm chứng từ (bắt buộc)".
    // Kiểm TRƯỚC khi ghi, theo id NHÁP mà tệp đang bám: ghi xong mới kiểm thì
    // hoặc phải xoá bản ghi vừa tạo, hoặc để lại một quyết định không chứng từ
    // đúng thứ ta vừa cấm.
    //
    // `thoi_viec` do màn Thôi việc tự sinh (chứng từ nằm ở hồ sơ thôi việc)
    // nên không đòi ở đây.
    if (dto.loaiThayDoi !== 'thoi_viec') {
      const soTep = dto.idNhap
        ? (
            await this.dinhKem_Service.danhSach({
              doiTuong: 'qua_trinh_cong_tac',
              doiTuongId: dto.idNhap,
            })
          ).length
        : 0;
      if (soTep === 0) {
        throw new BadRequestException(
          'Phải đính kèm quyết định (hoặc chứng từ tương đương) trước khi lưu',
        );
      }
    }

    // Snapshot the employee's CURRENT values before we mutate anything, so
    // the history record captures the true "before" state of this change.
    const entity = this.repo.create({
      employeeId: dto.employeeId,
      employeeName: emp.hoTen,
      employeeCode: emp.employeeId,
      loaiThayDoi: dto.loaiThayDoi,
      ngayHieuLuc: dto.ngayHieuLuc,
      phongBanCu,
      phongBanMoi,
      chucDanhCu: emp.chucDanh,
      chucDanhMoi: dto.chucDanhMoi,
      trangThaiCu: emp.trangThai,
      trangThaiMoi: dto.trangThaiMoi,
      mucLuongCu: emp.luongThoaThuan,
      mucLuongMoi: dto.mucLuongMoi,
      phuCapCu: emp.giaTriKhoan ?? undefined,
      phuCapMoi: dto.phuCapMoi,
      soQuyetDinh: dto.soQuyetDinh,
      lyDo: dto.lyDo,
      ghiChu: dto.ghiChu,
      isActive: true,
    } as Partial<EmploymentHistory>);

    const saved = await this.repo.save(entity);

    // Chuyển các tệp đang bám id nháp sang id thật. Lỗi ở bước này KHÔNG được
    // làm hỏng việc ghi quyết định — quyết định đã lưu, tệp thì đính lại được.
    if (dto.idNhap) {
      await this.dinhKem_Service
        .ganLai(
          'qua_trinh_cong_tac',
          dto.idNhap,
          // `saved.id` là getter của BaseEntity; `_id` là đường dự phòng khi
          // repo trả về đối tượng thuần (không qua TypeORM hydrate).
          String(saved.id ?? (saved as { _id?: unknown })._id ?? ''),
        )
        .catch(() => undefined);
    }

    // Ghi thay đổi lên hồ sơ. Chỉ trường CÓ trong dto mới được ghi, còn lại
    // giữ nguyên.
    //
    // Khác bản trước: LƯƠNG nay cũng được ghi (yêu cầu d13 cột G "khi thay đổi
    // thì thông tin lương của NLĐ cần được thay đổi"). Trước đây mức lương mới
    // chỉ nằm trên tờ quyết định, còn bảng lương tháng sau vẫn tính theo số
    // cũ — đúng loại sai lặng lẽ mà không ai phát hiện cho tới kỳ trả lương.
    if (dto.departmentIdMoi) emp.departmentId = dto.departmentIdMoi;
    emp.chucDanh = dto.chucDanhMoi ?? emp.chucDanh;
    emp.trangThai = dto.trangThaiMoi ?? emp.trangThai;
    if (typeof dto.mucLuongMoi === 'number') {
      emp.luongThoaThuan = dto.mucLuongMoi;
    }
    if (dto.phuCapMoi && Object.keys(dto.phuCapMoi).length) {
      // GỘP chứ không thay cả bảng: quyết định chỉ nói về vài khoản, các khoản
      // riêng khác của người này không có lý do gì bị xoá theo.
      emp.giaTriKhoan = { ...(emp.giaTriKhoan ?? {}), ...dto.phuCapMoi };
    }
    await this.employeeRepo.save(emp);

    return saved;
  }

  /**
   * Coerces the `isActive` filter value, which may arrive as a real boolean
   * (programmatic callers) or as the STRING "true"/"false" (HTTP query params
   * are never parsed to booleans by Nest's default query pipe). Defaults to
   * `true` when the value is absent, mirroring nhan-vien/hop-dong.
   */
  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(
    filter?: QuaTrinhCongTacFilter,
  ): Promise<EmploymentHistory[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.loaiThayDoi) where.loaiThayDoi = filter.loaiThayDoi;

    const list = await this.repo.find({ where });

    // Sort newest ngayHieuLuc first. Done client-side (rather than relying
    // on ORM-level order) to mirror how the mock repo behaves in tests and
    // keep behaviour explicit regardless of Mongo driver sort quirks.
    return [...list].sort((a, b) =>
      (b.ngayHieuLuc ?? '').localeCompare(a.ngayHieuLuc ?? ''),
    );
  }

  async findOne(id: string): Promise<EmploymentHistory> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(
        `Không tìm thấy quá trình công tác với ID ${id}`,
      );
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdateQuaTrinhCongTacDto,
  ): Promise<EmploymentHistory> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  /**
   * Phụ lục hợp đồng cho một quyết định thay đổi (yêu cầu d13).
   *
   * Dựng từ ẢNH CHỤP trên bản ghi (`mucLuongCu`, `phuCapCu`, `chucDanhCu`…)
   * chứ không đọc hồ sơ hiện tại: in lại phụ lục của một quyết định từ năm
   * ngoái phải ra đúng con số của năm ngoái, không phải mức lương hôm nay.
   *
   * `tenKhoan` lấy từ Cấu hình lương để in "Phụ cấp chức vụ" thay vì mã
   * `PC_CHUC_VU`; thiếu cấu hình thì in mã, vẫn hơn là không in gì.
   */
  async phuLuc(id: string): Promise<{ html: string }> {
    const td = await this.findOne(id);
    const emp = await this.findEmployee(td.employeeId).catch(() => null);
    const congTy = await this.hopDong_Service.getThongTinCongTy();

    // Nhãn khoản lương: đọc thẳng cấu hình (chỉ ĐỌC). Chưa cấu hình thì bảng
    // phụ lục in mã khoản — xấu nhưng vẫn đúng số, hơn là không in dòng nào.
    const cauHinh = await this.cauHinhLuongRepo
      .find({ where: { isActive: true } as any })
      .catch(() => []);
    const tenKhoan: Record<string, string> = Object.fromEntries(
      (cauHinh[0]?.khoanLuong ?? []).map((k) => [k.ma, k.ten]),
    );

    return {
      html: renderPhuLucDeIn({
        thayDoi: {
          soQuyetDinh: td.soQuyetDinh,
          ngayHieuLuc: td.ngayHieuLuc,
          loaiThayDoi: td.loaiThayDoi,
          lyDo: td.lyDo,
          phongBanCu: td.phongBanCu,
          phongBanMoi: td.phongBanMoi,
          chucDanhCu: td.chucDanhCu,
          chucDanhMoi: td.chucDanhMoi,
          mucLuongCu: td.mucLuongCu,
          mucLuongMoi: td.mucLuongMoi,
          phuCapCu: td.phuCapCu,
          phuCapMoi: td.phuCapMoi,
        },
        nhanVien: {
          hoTen: emp?.hoTen ?? td.employeeName,
          ngaySinh: emp?.ngaySinh,
          cccd: emp?.cccd,
          ngayCapCccd: emp?.ngayCapCccd,
          noiCapCccd: emp?.noiCapCccd,
          diaChi: emp?.diaChi,
        },
        congTy,
        tenKhoan,
      }),
    };
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
