import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoucherSequence, LoaiChungTu } from '@app/entities';

/** Tiền tố số phiếu dự phòng theo phân hệ (khi loại giao dịch chưa cấu hình loại chứng từ). */
const PREFIX_BY_LOAI: Record<LoaiChungTu, string> = {
  PHIEU_THU: 'PT',
  PHIEU_CHI: 'PC',
  KHAC: 'NK',
};

export interface VoucherNumberOptions {
  /**
   * Mã loại chứng từ — nếu có, dùng làm tiền tố và số chạy theo (mã, năm, tháng).
   * Không có → dùng tiền tố dự phòng PT/PC/NK theo `loai`, số chạy theo (loai, năm).
   */
  maLoaiChungTu?: string;
  /** Ngày chứng từ — lấy năm/tháng từ đây. Mặc định: hiện tại. */
  date?: Date;
}

@Injectable()
export class VoucherNumberService {
  constructor(
    @InjectRepository(VoucherSequence)
    private readonly sequenceRepository: Repository<VoucherSequence>,
  ) {}

  /**
   * Sinh 1 số phiếu.
   * - Có mã loại chứng từ: `{MA}{YYYY}{MM}/{SEQ}` (vd BH202606/007), số reset theo tháng.
   * - Không có mã (fallback): `{PT|PC|NK}{SEQ}/{YYYY}` (vd PT001/2026).
   */
  async generateVoucherNumber(
    loai: LoaiChungTu,
    opts?: VoucherNumberOptions,
  ): Promise<string> {
    const [first] = await this.generateVoucherNumbers(loai, 1, opts);
    return first;
  }

  /**
   * Sinh `count` số phiếu liên tiếp trong MỘT lần ghi sequence (dùng cho import/batch).
   */
  async generateVoucherNumbers(
    loai: LoaiChungTu,
    count: number,
    opts?: VoucherNumberOptions,
  ): Promise<string[]> {
    if (count <= 0) return [];

    const date = opts?.date ?? new Date();
    const year = date.getFullYear();
    const ma = opts?.maLoaiChungTu;

    if (ma) {
      const thang = date.getMonth() + 1;
      const start = await this.reserve({ loai: ma, year, thang }, count);
      return this.buildRange(count, start, (seq) =>
        this.formatByMa(ma, year, thang, seq),
      );
    }

    const prefix = PREFIX_BY_LOAI[loai] ?? 'PT';
    const start = await this.reserve({ loai, year }, count);
    return this.buildRange(count, start, (seq) =>
      this.formatByLoai(prefix, year, seq),
    );
  }

  /**
   * Đặt trước `count` số: tìm/khởi tạo bản ghi sequence theo khoá, tăng và lưu.
   * Trả về số bắt đầu của dải.
   */
  private async reserve(
    where: { loai: string; year: number; thang?: number },
    count: number,
  ): Promise<number> {
    let sequence = await this.sequenceRepository.findOne({ where });

    if (!sequence) {
      sequence = this.sequenceRepository.create({ ...where, lastSequence: 0 });
    }

    const start = sequence.lastSequence + 1;
    sequence.lastSequence += count;
    await this.sequenceRepository.save(sequence);
    return start;
  }

  private buildRange(
    count: number,
    start: number,
    format: (seq: number) => string,
  ): string[] {
    const numbers: string[] = [];
    for (let i = 0; i < count; i++) {
      numbers.push(format(start + i));
    }
    return numbers;
  }

  /** Định dạng số mới: `{MA}{YYYY}{MM}/{SEQ}` — vd BH202606/007. */
  private formatByMa(
    ma: string,
    year: number,
    thang: number,
    seq: number,
  ): string {
    const mm = thang.toString().padStart(2, '0');
    const seqStr = seq.toString().padStart(3, '0');
    return `${ma}${year}${mm}/${seqStr}`;
  }

  /** Định dạng số cũ (fallback): `{PREFIX}{SEQ}/{YYYY}` — vd PT001/2026. */
  private formatByLoai(prefix: string, year: number, seq: number): string {
    const seqStr = seq.toString().padStart(3, '0');
    return `${prefix}${seqStr}/${year}`;
  }

  /**
   * Parse số phiếu (fallback) để lấy thành phần. Chỉ áp dụng định dạng PT/PC/NK cũ.
   */
  parseVoucherNumber(soPhieu: string): {
    prefix: string;
    sequence: number;
    year: number;
  } | null {
    const match = soPhieu.match(/^(PT|PC|NK)(\d{3})\/(\d{4})$/);
    if (!match) return null;

    return {
      prefix: match[1],
      sequence: parseInt(match[2], 10),
      year: parseInt(match[3], 10),
    };
  }
}
