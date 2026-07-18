import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceLocation } from '@app/entities';
import { CreateDiaDiemChamCongDto, UpdateDiaDiemChamCongDto } from './dto';

export interface DiaDiemChamCongFilter {
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

@Injectable()
export class DiaDiemChamCong_Service {
  constructor(
    @InjectRepository(AttendanceLocation)
    private readonly repo: Repository<AttendanceLocation>,
  ) {}

  private validate(dto: {
    loai?: string;
    latitude?: number;
    longitude?: number;
    banKinh?: number;
    ipWifi?: string;
    maQr?: string;
  }): void {
    if (dto.loai === 'gps') {
      if (
        dto.latitude === undefined ||
        dto.latitude === null ||
        dto.longitude === undefined ||
        dto.longitude === null ||
        dto.banKinh === undefined ||
        dto.banKinh === null
      ) {
        throw new BadRequestException(
          'Địa điểm GPS cần toạ độ và bán kính',
        );
      }
    } else if (dto.loai === 'wifi') {
      if (!dto.ipWifi) {
        throw new BadRequestException('Địa điểm Wifi cần địa chỉ IP');
      }
    } else if (dto.loai === 'qr') {
      if (!dto.maQr) {
        throw new BadRequestException('Địa điểm QR cần mã QR');
      }
    }
  }

  async create(dto: CreateDiaDiemChamCongDto): Promise<AttendanceLocation> {
    this.validate(dto);

    const entity = this.repo.create({
      ...dto,
      isActive: dto.isActive ?? true,
    } as Partial<AttendanceLocation>);

    return this.repo.save(entity);
  }

  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(
    filter?: DiaDiemChamCongFilter,
  ): Promise<AttendanceLocation[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<AttendanceLocation> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy địa điểm chấm công với ID ${id}`);
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdateDiaDiemChamCongDto,
  ): Promise<AttendanceLocation> {
    const item = await this.findOne(id);

    const merged = { ...item, ...dto };
    this.validate(merged);

    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
