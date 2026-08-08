import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmploymentHistory, Employee } from '@app/entities';
import { PhongBanService } from '../phong-ban/phong-ban.service';
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
    const danhMuc = await this.phongBanService.list(token);
    const tenCua = (id?: string | null) =>
      id ? (danhMuc.find((d) => d.id === id)?.tenPhong ?? null) : undefined;

    const phongBanCu = tenCua(emp.departmentId);
    const phongBanMoi = tenCua(dto.departmentIdMoi);

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
      mucLuongMoi: dto.mucLuongMoi,
      soQuyetDinh: dto.soQuyetDinh,
      lyDo: dto.lyDo,
      ghiChu: dto.ghiChu,
      isActive: true,
    } as Partial<EmploymentHistory>);

    const saved = await this.repo.save(entity);

    // Apply: only the fields actually present in the dto are written onto
    // the employee record — everything else is left untouched. mucLuong is
    // decision-info only (Employee has no salary field), so it is NEVER
    // written back to the employee.
    if (dto.departmentIdMoi) emp.departmentId = dto.departmentIdMoi;
    emp.chucDanh = dto.chucDanhMoi ?? emp.chucDanh;
    emp.trangThai = dto.trangThaiMoi ?? emp.trangThai;
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

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
