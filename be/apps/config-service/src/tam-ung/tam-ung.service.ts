import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Employee, TamUngLuong } from '@app/entities';
import { CreateTamUngDto, DuyetTamUngDto } from './dto';

export interface TamUngFilter {
  thang?: string;
  employeeId?: string;
  trangThai?: string;
  isActive?: boolean | string;
}

@Injectable()
export class TamUng_Service {
  constructor(
    @InjectRepository(TamUngLuong)
    private readonly repo: Repository<TamUngLuong>,
    @InjectRepository(Employee)
    private readonly nhanVienRepo: Repository<Employee>,
  ) {}

  private objectId(id: string): ObjectId {
    try {
      return new ObjectId(id);
    } catch {
      throw new NotFoundException(`Id không hợp lệ: ${id}`);
    }
  }

  async findAll(filter?: TamUngFilter): Promise<TamUngLuong[]> {
    const where: Record<string, unknown> = {
      isActive: filter?.isActive === 'false' ? false : true,
    };
    if (filter?.thang) where.thang = filter.thang;
    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.trangThai) where.trangThai = filter.trangThai;

    const ds = await this.repo.find({ where: where as any });
    // Mới nhất lên đầu. Sắp trong bộ nhớ như các module khác của repo này —
    // driver Mongo ở đây không đảm bảo thứ tự nào cả.
    return [...ds].sort((a, b) =>
      (b.ngayDeNghi ?? '').localeCompare(a.ngayDeNghi ?? ''),
    );
  }

  async findOne(id: string): Promise<TamUngLuong> {
    const item = await this.repo.findOne({
      where: { _id: this.objectId(id) } as any,
    });
    if (!item) throw new NotFoundException('Không tìm thấy đơn tạm ứng');
    return item;
  }

  async create(dto: CreateTamUngDto, employeeId: string): Promise<TamUngLuong> {
    const nv = await this.nhanVienRepo.findOne({
      where: { _id: this.objectId(employeeId) } as any,
    });
    if (!nv) throw new NotFoundException('Không tìm thấy nhân viên');

    return this.repo.save(
      this.repo.create({
        employeeId,
        employeeName: nv.hoTen,
        employeeCode: nv.employeeId,
        thang: dto.thang,
        ngayDeNghi: dto.ngayDeNghi,
        soTien: dto.soTien,
        lyDo: dto.lyDo,
        ghiChu: dto.ghiChu,
        trangThai: 'cho_duyet',
        isActive: true,
      } as Partial<TamUngLuong>),
    );
  }

  /**
   * Duyệt hoặc từ chối.
   *
   * Đơn ĐÃ duyệt thì không duyệt lại: số của nó có thể đã vào bảng lương của
   * kỳ, và đổi trạng thái sau đó làm hai bên nói hai chuyện khác nhau. Muốn
   * sửa thì huỷ đơn (xoá mềm) rồi lập đơn mới — có dấu vết.
   */
  async duyet(
    id: string,
    dto: DuyetTamUngDto,
    nguoiDuyet: string,
    homNay: string,
  ): Promise<TamUngLuong> {
    const item = await this.findOne(id);
    if (item.trangThai !== 'cho_duyet') {
      throw new BadRequestException(
        `Đơn đã ở trạng thái "${item.trangThai}" — không duyệt lại được.`,
      );
    }
    if (dto.trangThai === 'tu_choi' && !dto.lyDoTuChoi?.trim()) {
      throw new BadRequestException('Nêu lý do từ chối');
    }

    item.trangThai = dto.trangThai;
    item.nguoiDuyet = nguoiDuyet;
    item.ngayDuyet = homNay;
    item.lyDoTuChoi =
      dto.trangThai === 'tu_choi' ? dto.lyDoTuChoi?.trim() : undefined;
    return this.repo.save(item);
  }

  /**
   * Huỷ đơn (xoá mềm). Chỉ đơn CHƯA duyệt mới huỷ được từ giao diện: đơn đã
   * duyệt có thể đã được trừ vào lương, huỷ âm thầm là mất dấu một khoản tiền
   * đã đưa.
   */
  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    if (item.trangThai === 'da_duyet') {
      throw new BadRequestException(
        'Đơn đã duyệt không huỷ được — số tiền có thể đã vào bảng lương.',
      );
    }
    item.isActive = false;
    await this.repo.save(item);
  }

  /** Người nộp chỉ được đụng vào đơn của chính mình. */
  async kiemChuNhan(id: string, employeeId: string): Promise<TamUngLuong> {
    const item = await this.findOne(id);
    if (item.employeeId !== employeeId) {
      throw new ForbiddenException('Đây không phải đơn của bạn');
    }
    return item;
  }

  /**
   * Tổng tiền tạm ứng ĐÃ DUYỆT của một kỳ, theo từng nhân viên.
   *
   * Bảng lương gọi hàm này lúc tổng hợp để điền sẵn ô "Tạm ứng" (yêu cầu d30).
   * Chỉ tính đơn `da_duyet`: đơn chờ duyệt mà trừ vào lương là trừ tiền chưa
   * ai đồng ý đưa.
   */
  async tongDaDuyetTheoKy(thang: string): Promise<Record<string, number>> {
    const ds = await this.repo.find({
      where: { thang, trangThai: 'da_duyet', isActive: true } as any,
    });
    const tong: Record<string, number> = {};
    for (const d of ds) {
      tong[d.employeeId] = (tong[d.employeeId] ?? 0) + (d.soTien ?? 0);
    }
    return tong;
  }
}
