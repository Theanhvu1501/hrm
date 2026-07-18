import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhanQuyen } from '@app/entities';

@Injectable()
export class PhanQuyen_Service {
  constructor(
    @InjectRepository(PhanQuyen)
    private readonly repo: Repository<PhanQuyen>,
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

  async findByVaiTro(vaiTro: string): Promise<PhanQuyen | null> {
    return this.repo.findOne({ where: { vaiTro } });
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
