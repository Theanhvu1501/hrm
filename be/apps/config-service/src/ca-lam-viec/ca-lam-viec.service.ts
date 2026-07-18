import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkShift } from '@app/entities';
import { CreateCaLamViecDto, UpdateCaLamViecDto } from './dto';

export interface CaLamViecFilter {
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class CaLamViec_Service {
  constructor(
    @InjectRepository(WorkShift)
    private readonly repo: Repository<WorkShift>,
  ) {}

  /**
   * Validates gioBatDau/gioKetThuc (and the optional break window), then
   * returns the computed `laCaQuaDem` flag. Overnight shifts (gioKetThuc <=
   * gioBatDau) are VALID — that's the signal for laCaQuaDem=true, not an
   * error condition.
   */
  private validateTimes(
    gioBatDau?: string,
    gioKetThuc?: string,
    gioNghiTu?: string,
    gioNghiDen?: string,
  ): boolean {
    if (!gioBatDau || !HHMM_RE.test(gioBatDau)) {
      throw new BadRequestException(
        'Giờ bắt đầu không hợp lệ, định dạng phải là HH:mm',
      );
    }

    if (!gioKetThuc || !HHMM_RE.test(gioKetThuc)) {
      throw new BadRequestException(
        'Giờ kết thúc không hợp lệ, định dạng phải là HH:mm',
      );
    }

    if (gioBatDau === gioKetThuc) {
      throw new BadRequestException(
        'Giờ bắt đầu và kết thúc không được trùng nhau',
      );
    }

    if ((gioNghiTu && !gioNghiDen) || (!gioNghiTu && gioNghiDen)) {
      throw new BadRequestException(
        'Giờ nghỉ phải có đủ cả giờ bắt đầu và giờ kết thúc',
      );
    }

    if (gioNghiTu && !HHMM_RE.test(gioNghiTu)) {
      throw new BadRequestException(
        'Giờ nghỉ (từ) không hợp lệ, định dạng phải là HH:mm',
      );
    }

    if (gioNghiDen && !HHMM_RE.test(gioNghiDen)) {
      throw new BadRequestException(
        'Giờ nghỉ (đến) không hợp lệ, định dạng phải là HH:mm',
      );
    }

    return toMinutes(gioKetThuc) <= toMinutes(gioBatDau);
  }

  async create(dto: CreateCaLamViecDto): Promise<WorkShift> {
    const laCaQuaDem = this.validateTimes(
      dto.gioBatDau,
      dto.gioKetThuc,
      dto.gioNghiTu,
      dto.gioNghiDen,
    );

    const entity = this.repo.create({
      ...dto,
      laCaQuaDem,
      laLinhHoat: dto.laLinhHoat ?? false,
      isActive: dto.isActive ?? true,
    } as Partial<WorkShift>);

    return this.repo.save(entity);
  }

  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(filter?: CaLamViecFilter): Promise<WorkShift[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<WorkShift> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy ca làm việc với ID ${id}`);
    }

    return item;
  }

  async update(id: string, dto: UpdateCaLamViecDto): Promise<WorkShift> {
    const item = await this.findOne(id);

    const gioBatDau = dto.gioBatDau ?? item.gioBatDau;
    const gioKetThuc = dto.gioKetThuc ?? item.gioKetThuc;
    const gioNghiTu = dto.gioNghiTu ?? item.gioNghiTu;
    const gioNghiDen = dto.gioNghiDen ?? item.gioNghiDen;

    const laCaQuaDem = this.validateTimes(
      gioBatDau,
      gioKetThuc,
      gioNghiTu,
      gioNghiDen,
    );

    Object.assign(item, dto, { laCaQuaDem });
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
