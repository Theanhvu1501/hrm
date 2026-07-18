import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Nganh, TenantAppConfig } from '@app/entities';
import { CreateNganhDto, UpdateNganhDto } from '@app/dto';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { sanitizeUpdateDto } from '@app/core';
import { DEFAULT_NGANH_SEED } from './nganh.seed';

@Injectable()
export class NganhService implements OnModuleInit {
  private readonly logger = new Logger(NganhService.name);

  constructor(
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`)
    private readonly nganhRepository: Repository<Nganh>,
    @InjectRepository(TenantAppConfig)
    private readonly tenantAppConfigRepository: Repository<TenantAppConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  async seedDefaults(): Promise<void> {
    const count = await this.nganhRepository.count();
    if (count > 0) return;
    const { ObjectId } = await import('mongodb');
    for (const item of DEFAULT_NGANH_SEED) {
      const entity = this.nganhRepository.create({
        _id: new ObjectId() as any,
        ...item,
      });
      await this.nganhRepository.save(entity);
    }
    this.logger.log(`Seeded ${DEFAULT_NGANH_SEED.length} ngành mặc định`);
  }

  async findAll(): Promise<Nganh[]> {
    return this.nganhRepository.find();
  }

  async findOne(id: string): Promise<Nganh> {
    const { ObjectId } = await import('mongodb');
    const found = await this.nganhRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!found) throw new NotFoundException(`Không tìm thấy ngành ${id}`);
    return found;
  }

  async create(dto: CreateNganhDto): Promise<Nganh> {
    const existing = await this.nganhRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Ngành với code ${dto.code} đã tồn tại`);

    const { ObjectId } = await import('mongodb');
    const entity = this.nganhRepository.create({
      _id: new ObjectId() as any,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive ?? true,
      glossary: dto.glossary ?? {},
    });
    return this.nganhRepository.save(entity);
  }

  async update(id: string, dto: UpdateNganhDto): Promise<Nganh> {
    const nganh = await this.findOne(id);
    const clean = sanitizeUpdateDto(dto as any);
    delete (clean as any).code; // code bất biến
    Object.assign(nganh, clean);
    return this.nganhRepository.save(nganh);
  }

  async delete(id: string): Promise<void> {
    const nganh = await this.findOne(id);
    const configs = await this.tenantAppConfigRepository.find();
    const inUse = configs.filter((c) => c.nganh === nganh.code);
    if (inUse.length > 0) {
      throw new ConflictException(
        `Không thể xóa: còn ${inUse.length} công ty đang dùng ngành này`,
      );
    }
    await this.nganhRepository.remove(nganh);
  }
}
