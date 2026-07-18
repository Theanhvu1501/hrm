import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRequest, Employee } from '@app/entities';
import { CreateDonChamCongDto, UpdateDonChamCongDto } from './dto';

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

  async create(dto: CreateDonChamCongDto): Promise<AttendanceRequest> {
    const emp = await this.findEmployee(dto.employeeId);

    const entity = this.repo.create({
      ...dto,
      employeeName: emp.hoTen,
      employeeCode: emp.employeeId,
      trangThai: dto.trangThai ?? 'cho_duyet',
      isActive: true,
    } as Partial<AttendanceRequest>);

    return this.repo.save(entity);
  }

  async updateStatus(
    id: string,
    trangThai: string,
    nguoiDuyet?: string,
  ): Promise<AttendanceRequest> {
    const item = await this.findOne(id);

    item.trangThai = trangThai;
    if (nguoiDuyet !== undefined) {
      item.nguoiDuyet = nguoiDuyet;
    }

    return this.repo.save(item);
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

  async update(
    id: string,
    dto: UpdateDonChamCongDto,
  ): Promise<AttendanceRequest> {
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
