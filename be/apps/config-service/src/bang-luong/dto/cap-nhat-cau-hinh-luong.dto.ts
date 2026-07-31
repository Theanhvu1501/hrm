import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { KhoanLuong, BacThue } from '@app/entities';

export class HeSoTichQuyDto {
  @IsNumber() @Min(1) ngay_thuong: number;
  @IsNumber() @Min(1) ngay_nghi: number;
  @IsNumber() @Min(1) ngay_le: number;
}

/** Sàn hệ số tích quỹ khi `cheDoBu = 'chi_nghi_bu'` — đúng BẰNG sàn trả tiền BLLĐ 2019 Đ98.1.
 *  Nghỉ bù là hình thức bù DUY NHẤT ở chế độ này (không trả thêm tiền), nên tích
 *  dưới sàn này là trả thiếu công cho người lao động. */
const SAN_HE_SO_CHI_NGHI_BU: Record<'ngay_thuong' | 'ngay_nghi' | 'ngay_le', number> = {
  ngay_thuong: 1.5,
  ngay_nghi: 2.0,
  ngay_le: 3.0,
};

const TRUONG_HE_SO = ['ngay_thuong', 'ngay_nghi', 'ngay_le'] as const;
const KHONG_HO_TRO =
  'Chế độ bù này chưa được hỗ trợ ở phiên bản hiện tại (mới hỗ trợ "chỉ nghỉ bù")';

/**
 * Ba ràng buộc KHÔNG diễn đạt được bằng decorator rời, và cả ba đều sai thành
 * tiền thật nếu để lọt:
 *  1. Chế độ chưa nối bảng lương (P4.2b) — lưu được nhưng hành xử sai.
 *  2. `nghi_bu_va_chenh` mà hệ số tích ≠ 1.0 — bảng lương đã trả phần chênh
 *     rồi, tích quỹ ở 1.5 nữa là trả gấp đôi cho cùng một giờ công.
 *  3. `chi_nghi_bu` mà hệ số tích dưới sàn BLLĐ 2019 Đ98.1 — nghỉ bù là bù
 *     DUY NHẤT ở chế độ này, tích thiếu là trả thiếu công thật.
 *
 * `lyDoTuChoi()` là NGUỒN DUY NHẤT của cả kết quả pass/fail lẫn thông điệp —
 * `validate()` và `defaultMessage()` cùng gọi nó. Tách hai nơi tính lý do
 * riêng (bản cũ) khiến `defaultMessage()` phải ĐOÁN lý do chỉ từ `cheDoBu`,
 * không biết `validate()` thực sự rớt ở nhánh nào — nên khi `nghi_bu_va_chenh`
 * đã đúng hệ số 1.0 (chỉ còn vướng "chưa hỗ trợ"), nó vẫn báo nhầm là sai hệ số.
 */
@ValidatorConstraint({ name: 'cauHinhLamThemHopLe', async: false })
export class CauHinhLamThemHopLe implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    return this.lyDoTuChoi(value) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return this.lyDoTuChoi(args.value) ?? 'Cấu hình làm thêm không hợp lệ';
  }

  private lyDoTuChoi(lt: any): string | null {
    if (!lt) return null;

    const h = lt.heSoTichQuy ?? {};

    if (lt.cheDoBu === 'nghi_bu_va_chenh') {
      for (const truong of TRUONG_HE_SO) {
        if (h[truong] !== 1) {
          return `Chế độ "nghỉ bù và trả chênh" bắt buộc hệ số tích quỹ = 1.0 cả ba (đang sai ở ${truong} = ${h[truong]})`;
        }
      }
      // Hệ số đúng 1.0 cả ba rồi — vẫn còn vướng ở chỗ chế độ này CHƯA nối
      // bảng lương ở chặng này, không được lẫn với lỗi hệ số phía trên.
      return KHONG_HO_TRO;
    }

    if (lt.cheDoBu === 'chi_nghi_bu') {
      for (const truong of TRUONG_HE_SO) {
        const san = SAN_HE_SO_CHI_NGHI_BU[truong];
        if (!(h[truong] >= san)) {
          // toFixed(1) để "3" hiện thành "3.0" — khớp đúng số thập phân sàn
          // BLLĐ ghi trong luật, tránh nhầm với số nguyên bất kỳ.
          return `Hệ số tích quỹ "${truong}" phải ≥ ${san.toFixed(1)} (sàn BLLĐ 2019 Đ98.1) khi chế độ là "chỉ nghỉ bù" — đang là ${h[truong]}`;
        }
      }
      return null;
    }

    // chi_tien / nhan_vien_chon: chưa nối bảng lương, không cần xét hệ số.
    return KHONG_HO_TRO;
  }
}

export class CauHinhLamThemDto {
  @IsIn(['chi_nghi_bu', 'chi_tien', 'nhan_vien_chon', 'nghi_bu_va_chenh'])
  cheDoBu: string;

  @ValidateNested() @Type(() => HeSoTichQuyDto) heSoTichQuy: HeSoTichQuyDto;

  @IsOptional() @IsInt() @Min(1) soThangHanDung: number | null;

  @IsIn(['quy_ra_tien', 'huy_bo']) khiHetHan: string;
}

export class CapNhatCauHinhLuongDto {
  @IsOptional() @IsNumber() mucKhaiBaoMacDinh?: number;
  @IsOptional() @IsNumber() congChuan?: number;
  @IsOptional() @IsArray() khoanLuong?: KhoanLuong[];
  @IsOptional() @IsNumber() giamTruBanThan?: number;
  @IsOptional() @IsNumber() giamTruNPT?: number;
  @IsOptional() @IsObject() bhxh?: { tyLe: number; canCu: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN' };
  @IsOptional() @IsArray() bacThue?: BacThue[];
  @IsOptional() @IsObject() thuViec?: { tyLe: number };
  @IsOptional() @IsObject() quyTacThoiVu?: { tyLe: number; nguong: number };
  @IsOptional() @IsObject() quyTacCamKet?: { mienThue: boolean };
  @IsOptional() @IsObject() bhCongTy?: { tyLe: number; tyLeHopDongThu2: number };
  @IsOptional() @IsNumber() lamTron?: number;

  @IsOptional() @IsNumber() @Min(0.5) soGioMoiNgay?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CauHinhLamThemDto)
  @Validate(CauHinhLamThemHopLe)
  lamThem?: CauHinhLamThemDto;
}
