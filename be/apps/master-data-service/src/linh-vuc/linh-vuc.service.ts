import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { LinhVuc, TenantAppConfig } from '@app/entities';
import { CreateLinhVucDto, UpdateLinhVucDto } from '@app/dto';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { sanitizeUpdateDto } from '@app/core';
import { DEFAULT_LINH_VUC_SEED } from './linh-vuc.seed';
import { seedMenuCatalog } from '../menu-catalog/menu-catalog.seed';

const DEFAULT_LINH_VUC_CODE = 'KE_TOAN';

@Injectable()
export class LinhVucService implements OnModuleInit {
  private readonly logger = new Logger(LinhVucService.name);

  constructor(
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}LinhVuc`)
    private readonly linhVucRepository: Repository<LinhVuc>,
    @InjectRepository(TenantAppConfig)
    private readonly tenantAppConfigRepository: Repository<TenantAppConfig>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
    await seedMenuCatalog(this.dataSource);
  }

  async seedDefaults(): Promise<void> {
    const count = await this.linhVucRepository.count();
    if (count > 0) return;
    const { ObjectId } = await import('mongodb');
    for (const item of DEFAULT_LINH_VUC_SEED) {
      const entity = this.linhVucRepository.create({
        _id: new ObjectId() as any,
        isActive: true,
        ...item,
      });
      await this.linhVucRepository.save(entity);
    }
    this.logger.log(`Seeded ${DEFAULT_LINH_VUC_SEED.length} lĩnh vực mặc định`);
  }

  async findAll(): Promise<LinhVuc[]> {
    return this.linhVucRepository.find({ order: { order: 'ASC' } });
  }

  async findOne(id: string): Promise<LinhVuc> {
    const { ObjectId } = await import('mongodb');
    const found = await this.linhVucRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!found) throw new NotFoundException(`Không tìm thấy lĩnh vực ${id}`);
    return found;
  }

  async create(dto: CreateLinhVucDto): Promise<LinhVuc> {
    const existing = await this.linhVucRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Lĩnh vực với code ${dto.code} đã tồn tại`);

    const { ObjectId } = await import('mongodb');
    const entity = this.linhVucRepository.create({
      _id: new ObjectId() as any,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      icon: dto.icon ?? 'AppstoreOutlined',
      color: dto.color ?? '#1B3A6B',
      order: dto.order ?? 0,
      isActive: dto.isActive ?? true,
      menuKeys: dto.menuKeys ?? [],
    });
    return this.linhVucRepository.save(entity);
  }

  async update(id: string, dto: UpdateLinhVucDto): Promise<LinhVuc> {
    const linhVuc = await this.findOne(id);
    // code bất biến: sanitizeUpdateDto loại undefined; ta loại thêm 'code' nếu lọt vào.
    const clean = sanitizeUpdateDto(dto as any);
    delete (clean as any).code;
    Object.assign(linhVuc, clean);
    return this.linhVucRepository.save(linhVuc);
  }

  async delete(id: string): Promise<void> {
    const linhVuc = await this.findOne(id);

    if (linhVuc.code === DEFAULT_LINH_VUC_CODE) {
      throw new ConflictException(
        'Không thể xóa lĩnh vực mặc định hệ thống (Kế toán)',
      );
    }

    const configs = await this.tenantAppConfigRepository.find();
    const inUse = configs.filter((c) => (c.modules ?? []).includes(linhVuc.code));
    if (inUse.length > 0) {
      throw new ConflictException(
        `Không thể xóa: còn ${inUse.length} công ty đang dùng lĩnh vực này`,
      );
    }

    await this.linhVucRepository.remove(linhVuc);
  }
}
