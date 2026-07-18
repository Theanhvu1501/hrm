import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VaiTro } from '@app/entities';

const DEFAULT_ROLES = [
  { ten: 'HR Admin', moTa: 'Quản lý toàn bộ hệ thống nhân sự' },
  { ten: 'Quản lý trực tiếp', moTa: 'Quản lý nhân viên thuộc phòng ban' },
  { ten: 'Nhân viên', moTa: 'Nhân viên sử dụng hệ thống' },
];

@Injectable()
export class VaiTro_Service implements OnModuleInit {
  constructor(
    @InjectRepository(VaiTro)
    private readonly repo: Repository<VaiTro>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultRoles();
  }

  private async seedDefaultRoles() {
    const count = await this.repo.count();
    if (count > 0) return;

    for (const role of DEFAULT_ROLES) {
      const entity = this.repo.create({ ...role, isActive: true });
      await this.repo.save(entity);
    }
  }

  async findAll(): Promise<VaiTro[]> {
    return this.repo.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<VaiTro> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID ${id}`);
    }

    return item;
  }

  async create(data: Partial<VaiTro>): Promise<VaiTro> {
    if (data.ten) {
      const existing = await this.repo.findOne({ where: { ten: data.ten } });
      if (existing) {
        throw new ConflictException(`Vai trò "${data.ten}" đã tồn tại`);
      }
    }

    const item = this.repo.create(data);
    return this.repo.save(item);
  }

  async update(id: string, data: Partial<VaiTro>): Promise<VaiTro> {
    const item = await this.findOne(id);

    if (data.ten && data.ten !== item.ten) {
      const existing = await this.repo.findOne({ where: { ten: data.ten } });
      if (existing) {
        throw new ConflictException(`Vai trò "${data.ten}" đã tồn tại`);
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
}
