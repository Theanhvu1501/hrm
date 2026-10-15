import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Holiday } from '@app/entities';
import { CreateNgayLeDto, UpdateNgayLeDto } from './dto';

export interface NgayLeFilter {
  // Giá trị từ query-string luôn là chuỗi (?nam=2026), nên phải nhận cả hai dạng.
  nam?: number | string;
  isActive?: boolean | string;
}

const CACHE_KEY_PREFIX = 'ngay-le';
const CACHE_TTL = 10 * 60 * 1000; // 10 phút

@Injectable()
export class NgayLe_Service {
  constructor(
    @InjectRepository(Holiday)
    private readonly repo: Repository<Holiday>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Chuỗi "YYYY-MM-DD" so sánh từ điển trùng với so sánh thời gian, nên
   * không cần chuyển sang Date — tránh luôn bẫy múi giờ.
   */
  private validateKhoang(tuNgay: string, denNgay: string): number {
    if (denNgay < tuNgay) {
      throw new BadRequestException('Đến ngày không được nhỏ hơn từ ngày');
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

    const saved = await this.repo.save(entity);
    await this.invalidateCache();
    return saved;
  }

  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(filter?: NgayLeFilter): Promise<Holiday[]> {
    const isActive = this.coerceIsActive(filter?.isActive);
    const nam = filter?.nam !== undefined && filter.nam !== '' ? Number(filter.nam) : null;
    const cacheKey = `${CACHE_KEY_PREFIX}:all:${nam ?? 'all'}:${isActive}`;

    const cached = await this.cache.get<Holiday[]>(cacheKey);
    if (cached) {
      console.log(`[NgayLe] Cache HIT: ${cacheKey}`);
      return cached;
    }

    console.log(`[NgayLe] Cache MISS: ${cacheKey}`);
    const where: Record<string, any> = { isActive };
    if (nam !== null) {
      where.nam = nam;
    }
    const result = await this.repo.find({ where });
    await this.cache.set(cacheKey, result, CACHE_TTL);
    return result;
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
   *
   * Cột `nam` được suy từ `tuNgay`, nên một kỳ nghỉ vắt qua năm mới (vd.
   * tuNgay '2026-12-31', denNgay '2027-01-01') mang nam = 2026 dù `ngay`
   * truyền vào có thể là '2027-01-01'. Vì một kỳ nghỉ không thể dài hơn một
   * năm, bản ghi chứa `ngay` chỉ có thể bắt đầu ở năm của `ngay` hoặc năm
   * liền trước — nên quét cả hai năm rồi mới lọc theo khoảng ngày thực tế.
   */
  async timTheoNgay(ngay: string): Promise<Holiday | null> {
    const nam = Number(ngay.slice(0, 4));
    const dsTrongNam = await this.repo.find({
      where: { nam: In([nam - 1, nam]), isActive: true },
    });
    const khop = dsTrongNam.find((h) => h.tuNgay <= ngay && ngay <= h.denNgay);
    return khop ?? null;
  }

  /**
   * Mọi ngày lễ GIAO với khoảng [tuNgay, denNgay] — bản theo khoảng của
   * `timTheoNgay`, dùng cho màn hình lịch tuần. Hỏi từng ngày một là 7 lượt
   * truy vấn mỗi lần lật tuần, nạp đi nạp lại cùng một tập ngày lễ.
   *
   * Quét từ `năm(tuNgay) - 1` tới `năm(denNgay)` vì cùng lý do đã ghi ở
   * `timTheoNgay`: cột `nam` suy từ `tuNgay` của kỳ nghỉ, nên kỳ vắt qua năm
   * mới mang năm cũ.
   */
  async timTheoKhoang(tuNgay: string, denNgay: string): Promise<Holiday[]> {
    const namDau = Number(tuNgay.slice(0, 4)) - 1;
    const namCuoi = Number(denNgay.slice(0, 4));
    const cacNam: number[] = [];
    for (let n = namDau; n <= namCuoi; n += 1) cacNam.push(n);

    const ds = await this.repo.find({
      where: { nam: In(cacNam), isActive: true },
    });

    // Hai khoảng giao nhau khi mỗi khoảng bắt đầu trước khi khoảng kia kết
    // thúc — chạm biên vẫn tính là giao.
    return ds.filter((h) => h.tuNgay <= denNgay && tuNgay <= h.denNgay);
  }

  async update(id: string, dto: UpdateNgayLeDto): Promise<Holiday> {
    const item = await this.findOne(id);
    const tuNgay = dto.tuNgay ?? item.tuNgay;
    const denNgay = dto.denNgay ?? item.denNgay;
    const nam = this.validateKhoang(tuNgay, denNgay);

    Object.assign(item, dto, { nam });
    const saved = await this.repo.save(item);
    await this.invalidateCache();
    return saved;
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
    await this.invalidateCache();
  }

  /**
   * Xóa tất cả cache liên quan đến ngày lễ.
   * Vì không biết chính xác các key đang có, xóa các key phổ biến.
   */
  private async invalidateCache(): Promise<void> {
    try {
      // Xóa các key cache phổ biến
      const keysToDelete = [
        `${CACHE_KEY_PREFIX}:all:all:true`,
        `${CACHE_KEY_PREFIX}:all:all:false`,
      ];
      // Thêm các năm gần đây
      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        keysToDelete.push(`${CACHE_KEY_PREFIX}:all:${y}:true`);
        keysToDelete.push(`${CACHE_KEY_PREFIX}:all:${y}:false`);
      }
      await Promise.all(keysToDelete.map((k) => this.cache.del(k)));
      console.log(`[NgayLe] Cache invalidated: ${keysToDelete.length} keys`);
    } catch (err) {
      console.warn(`[NgayLe] Cache invalidate failed:`, err);
    }
  }
}
