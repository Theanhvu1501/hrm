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

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }

  /**
   * Updates the resignation's status. When the new status is 'hoan_thanh'
   * (bàn giao hoàn tất) or 'da_duyet' (đã duyệt), the offboarding takes
   * effect: the linked employee's trangThai flips to 'da_nghi'. For
   * 'tu_choi'/'cho_duyet' the employee record is left untouched.
   */
  async updateStatus(id: string, trangThai: string): Promise<Resignation> {
    const item = await this.findOne(id);
    item.trangThai = trangThai;
    const saved = await this.repo.save(item);

    if (trangThai === 'hoan_thanh' || trangThai === 'da_duyet') {
      const emp = await this.findEmployee(item.employeeId);
      emp.trangThai = 'da_nghi';
      await this.employeeRepo.save(emp);
    }

    return saved;
  }
}
