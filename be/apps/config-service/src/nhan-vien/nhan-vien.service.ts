import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeCounter } from '@app/entities';
import { TenantContextService } from '@app/core';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';

export interface EmployeeFilter {
  hoTen?: string;
  phongBan?: string;
  trangThai?: string;
  isActive?: boolean;
}

@Injectable()
export class NhanVien_Service {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    @InjectRepository(EmployeeCounter)
    private readonly counterRepo: Repository<EmployeeCounter>,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Maintains ONE EmployeeCounter doc per tenant, incrementing `seq` and
   * returning a zero-padded employeeId like NV0001, NV0002, ...
   */
  async generateEmployeeId(tenantId?: string): Promise<string> {
    let counter: EmployeeCounter | null = await this.counterRepo.findOne({
      where: { tenantId } as any,
    });

    if (!counter) {
      counter = this.counterRepo.create({ tenantId, seq: 0 });
    }

    counter.seq = (counter.seq ?? 0) + 1;
    await this.counterRepo.save(counter);

    return 'NV' + String(counter.seq).padStart(4, '0');
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const existingCccd = await this.repo.findOne({
      where: { cccd: dto.cccd },
    });
    if (existingCccd) {
      throw new ConflictException('CCCD đã tồn tại trong hệ thống');
    }

    if (dto.mst) {
      const existingMst = await this.repo.findOne({
        where: { mst: dto.mst },
      });
      if (existingMst) {
        throw new ConflictException('MST đã tồn tại trong hệ thống');
      }
    }

    const tenantId = this.tenantContext.getCurrentTenantId();
    const employeeId = await this.generateEmployeeId(tenantId);

    const entity = this.repo.create({
      ...dto,
      employeeId,
      isActive: true,
    } as Partial<Employee>);

    return this.repo.save(entity);
  }

  async findAll(filter?: EmployeeFilter): Promise<Employee[]> {
    const where: Record<string, any> = {
      isActive: filter?.isActive ?? true,
    };

    if (filter?.hoTen) where.hoTen = filter.hoTen;
    if (filter?.phongBan) where.phongBan = filter.phongBan;
    if (filter?.trangThai) where.trangThai = filter.trangThai;

    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<Employee> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID ${id}`);
    }

    return item;
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const item = await this.findOne(id);

    if (dto.cccd && dto.cccd !== item.cccd) {
      const existing = await this.repo.findOne({ where: { cccd: dto.cccd } });
      if (existing) {
        throw new ConflictException('CCCD đã tồn tại trong hệ thống');
      }
    }

    if (dto.mst && dto.mst !== item.mst) {
      const existing = await this.repo.findOne({ where: { mst: dto.mst } });
      if (existing) {
        throw new ConflictException('MST đã tồn tại trong hệ thống');
      }
    }

    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }

  async updateStatus(id: string, trangThai: string): Promise<Employee> {
    const item = await this.findOne(id);
    item.trangThai = trangThai;
    return this.repo.save(item);
  }
}
