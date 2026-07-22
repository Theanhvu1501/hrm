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
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
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
   *
   * Uses an atomic MongoDB findOneAndUpdate($inc) on the raw (non-tenant-proxied,
   * non-ORM-cached) mongo repository so concurrent create() calls for the same
   * tenant can never read-modify-write the same seq value. The tenant-aware
   * repository proxy (see @app/database DatabaseModule) does not intercept
   * findOneAndUpdate, so the explicit `{ tenantId }` filter below is exactly
   * what reaches MongoDB — no reliance on proxy-injected filtering.
   */
  async generateEmployeeId(tenantId?: string): Promise<string> {
    const mongoCounterRepo = this.counterRepo.manager.getMongoRepository(
      EmployeeCounter,
    ) as unknown as import('typeorm').MongoRepository<EmployeeCounter>;

    const updated = await mongoCounterRepo.findOneAndUpdate(
      { tenantId } as any,
      { $inc: { seq: 1 } } as any,
      { upsert: true, returnDocument: 'after' } as any,
    );

    const seq = (updated as any)?.seq;
    return 'NV' + String(seq).padStart(4, '0');
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

    if (dto.userId) {
      const existingUserId = await this.repo.findOne({
        // `isActive: true` là bắt buộc, không phải tuỳ chọn: thiếu nó thì
        // một hồ sơ ĐÃ XOÁ MỀM vẫn giam `userId` vĩnh viễn — HR không gán
        // lại tài khoản đó cho ai được nữa và người dùng mất hẳn đường chấm
        // công, chỉ gỡ được bằng cách sửa thẳng MongoDB. Lọc trùng khớp
        // `resolveEmployeeFromUser()`, nơi cũng chỉ tra hồ sơ còn hiệu lực.
        where: { userId: dto.userId, isActive: true },
      });
      if (existingUserId) {
        throw new ConflictException(
          'Tài khoản này đã được liên kết với một nhân viên khác',
        );
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

  /**
   * Coerces the `isActive` filter value, which may arrive as a real boolean
   * (programmatic callers) or as the STRING "true"/"false" (HTTP query params
   * are never parsed to booleans by Nest's default query pipe). Defaults to
   * `true` when the value is absent, mirroring the previous behaviour.
   */
  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(filter?: EmployeeFilter): Promise<Employee[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
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

    if (dto.userId && dto.userId !== item.userId) {
      const existing = await this.repo.findOne({
        // Xem chú thích cùng nhánh trong create(): thiếu `isActive: true`
        // thì hồ sơ xoá mềm giam luôn tài khoản, không có đường gỡ từ giao
        // diện. Nhánh `dto.userId &&` cố ý bỏ qua chuỗi rỗng — FE gửi ''
        // để GỠ liên kết, và gỡ liên kết thì không có gì để kiểm trùng.
        where: { userId: dto.userId, isActive: true },
      });
      if (existing) {
        throw new ConflictException(
          'Tài khoản này đã được liên kết với một nhân viên khác',
        );
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

  /**
   * Suy hồ sơ nhân viên từ tài khoản đang đăng nhập.
   *
   * Đây là cửa duy nhất cho mọi endpoint tự phục vụ (chấm công, đơn từ).
   * Không bao giờ nhận employeeId từ body — nếu nhận thì tồn tại đường
   * chấm công hộ người khác qua API.
   */
  async resolveEmployeeFromUser(user: { id: string }): Promise<Employee> {
    if (!user?.id) {
      throw new NotFoundException(
        'Tài khoản chưa được liên kết với hồ sơ nhân viên',
      );
    }

    const emp = await this.repo.findOne({
      where: { userId: user.id, isActive: true },
    });

    if (!emp) {
      throw new NotFoundException(
        'Tài khoản chưa được liên kết với hồ sơ nhân viên. Liên hệ HR để được gán.',
      );
    }

    return emp;
  }
}
