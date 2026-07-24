import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhanQuyen } from '@app/entities';
import { TenantContextService } from '@app/core';

@Injectable()
export class PhanQuyen_Service {
  constructor(
    @InjectRepository(PhanQuyen)
    private readonly repo: Repository<PhanQuyen>,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(): Promise<PhanQuyen[]> {
    return this.repo.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<PhanQuyen> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy phân quyền với ID ${id}`);
    }

    return item;
  }

  /**
   * Lọc `tenantId` TƯỜNG MINH chứ không phó mặc cho proxy tenant của
   * `DatabaseModule.forFeature` (libs/database/src/database.module.ts): proxy
   * đó là một lớp bọc vô hình, no-op im lặng khi không có tenant context và
   * biến mất hoàn toàn nếu ai đó đổi module sang `TypeOrmModule.forFeature`
   * hay `forFeatureRaw`. Với hàm này thì mất lọc không chỉ là lộ dữ liệu:
   * `vaiTro` là tên tự do từng tenant tự đặt ("Quản lý", "HR Admin"), nên hai
   * tenant trùng tên vai trò là chuyện thường, và cả ba nơi gọi hàm này đều
   * GHI theo kết quả nó trả về — `upsertPermissions()` ghi đè `permissions`
   * lên đúng hàng nó tìm thấy, `create()`/`update()` dựa vào nó để kết luận
   * "tên vai trò đã tồn tại". Trả nhầm hàng của tenant khác là sửa bảng thẩm
   * quyền của công ty khác.
   */
  async findByVaiTro(vaiTro: string): Promise<PhanQuyen | null> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return this.repo.findOne({
      // Không có tenant context (tiến trình nền, script) thì KHÔNG thêm
      // `tenantId: undefined` vào điều kiện — Mongo sẽ hiểu thành "khớp hàng
      // không có tenantId" và trả về nhầm hàng, tệ hơn là không lọc.
      where: tenantId ? { vaiTro, tenantId } : { vaiTro },
    });
  }

  async create(data: Partial<PhanQuyen>): Promise<PhanQuyen> {
    if (data.vaiTro) {
      const existing = await this.findByVaiTro(data.vaiTro);
      if (existing) {
        throw new ConflictException(
          `PhanQuyen with role ${data.vaiTro} already exists`,
        );
      }
    }

    const item = this.repo.create(data);
    return this.repo.save(item);
  }

  async update(id: string, data: Partial<PhanQuyen>): Promise<PhanQuyen> {
    const item = await this.findOne(id);

    if (data.vaiTro && data.vaiTro !== item.vaiTro) {
      const existing = await this.findByVaiTro(data.vaiTro);
      if (existing) {
        throw new ConflictException(
          `PhanQuyen with role ${data.vaiTro} already exists`,
        );
      }
    }

    Object.assign(item, data);
    return this.repo.save(item);
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }

  async getPermissionsByVaiTro(vaiTro: string): Promise<string[]> {
    const phanQuyen = await this.findByVaiTro(vaiTro);
    return phanQuyen?.permissions || [];
  }

  async upsertPermissions(
    vaiTro: string,
    permissions: string[],
  ): Promise<PhanQuyen> {
    const existing = await this.findByVaiTro(vaiTro);

    if (existing) {
      existing.permissions = permissions;
      return this.repo.save(existing);
    }

    const item = this.repo.create({
      vaiTro,
      ten: vaiTro,
      permissions,
      isActive: true,
    });
    return this.repo.save(item);
  }
}
