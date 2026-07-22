import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Holiday } from '@app/entities';
import { CreateNgayLeDto, UpdateNgayLeDto } from './dto';

export interface NgayLeFilter {
  // Giá trị từ query-string luôn là chuỗi (?nam=2026), nên phải nhận cả hai dạng.
  nam?: number | string;
  isActive?: boolean | string;
}

@Injectable()
export class NgayLe_Service {
  constructor(
    @InjectRepository(Holiday)
    private readonly repo: Repository<Holiday>,
  ) {}

  /**
   * Chuỗi "YYYY-MM-DD" so sánh từ điển trùng với so sánh thời gian, nên
   * không cần chuyển sang Date — tránh luôn bẫy múi giờ.
   */
  private validateKhoang(tuNgay: string, denNgay: string): number {
    if (denNgay < tuNgay) {
      throw new BadRequestException(
        'Đến ngày không được nhỏ hơn từ ngày',
      );
    }
    const nam = Number(tuNgay.slice(0, 4));
    if (!Number.isInteger(nam)) {
      throw new BadRequestException('Từ ngày không hợp lệ');
    }
    return nam;
  }

  async create(dto: CreateNgayLeDto): Promise<Holiday> {
    const nam = this.validateKhoang(dto.tuNgay, dto.denNgay);

    const entity = this.repo.create({
      ...dto,
      nam,
      loai: dto.loai ?? 'le',
      huongLuong: dto.huongLuong ?? true,
      isActive: dto.isActive ?? true,
    } as Partial<Holiday>);

    return this.repo.save(entity);
  }

  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(filter?: NgayLeFilter): Promise<Holiday[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };
    if (filter?.nam !== undefined && filter.nam !== '') {
      where.nam = Number(filter.nam);
    }
    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<Holiday> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy ngày lễ với ID ${id}`);
    }
    return item;
  }

  /**
   * Dùng bởi ban-ghi-cham-cong để suy cờ laNgayNghi. Trả về bản ghi lễ đầu
   * tiên chứa `ngay`, hoặc null.
   */
  async timTheoNgay(ngay: string): Promise<Holiday | null> {
    const nam = Number(ngay.slice(0, 4));
    const dsTrongNam = await this.repo.find({ where: { nam, isActive: true } });
    const khop = dsTrongNam.find(
      (h) => h.tuNgay <= ngay && ngay <= h.denNgay,
    );
    return khop ?? null;
  }

  async update(id: string, dto: UpdateNgayLeDto): Promise<Holiday> {
    const item = await this.findOne(id);
    const tuNgay = dto.tuNgay ?? item.tuNgay;
    const denNgay = dto.denNgay ?? item.denNgay;
    const nam = this.validateKhoang(tuNgay, denNgay);

    Object.assign(item, dto, { nam });
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
