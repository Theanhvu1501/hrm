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

/**
 * Hai ràng buộc KHÔNG diễn đạt được bằng decorator rời, và cả hai đều sai
 * thành tiền thật nếu để lọt:
 *  1. Chế độ chưa nối bảng lương (P4.2b) — lưu được nhưng hành xử sai.
 *  2. `nghi_bu_va_chenh` mà hệ số tích > 1.0 — bảng lương đã trả phần chênh
 *     rồi, tích quỹ ở 1.5 nữa là trả gấp đôi cho cùng một giờ công.
 */
@ValidatorConstraint({ name: 'cauHinhLamThemHopLe', async: false })
export class CauHinhLamThemHopLe implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const v = args.object as any;
    const lt = v.lamThem;
    if (!lt) return true;

    // nghi_bu_va_chenh với hệ số ≠ 1.0 là lỗi RIÊNG, phải báo đúng lý do — kiểm
    // TRƯỚC nhánh "chế độ chưa hỗ trợ", nếu không luật hệ số thành nhánh chết và
    // ship mà chưa từng được test.
    if (lt.cheDoBu === 'nghi_bu_va_chenh') {
      const h = lt.heSoTichQuy ?? {};
      if (!(h.ngay_thuong === 1 && h.ngay_nghi === 1 && h.ngay_le === 1)) return false;
    }
    if (lt.cheDoBu !== 'chi_nghi_bu') return false;
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const lt = (args.object as any).lamThem;
    if (lt?.cheDoBu === 'nghi_bu_va_chenh') {
      return 'Chế độ "nghỉ bù và trả chênh" bắt buộc hệ số tích quỹ = 1.0 cả ba, vì bảng lương đã trả phần chênh';
    }
    return 'Chế độ bù này chưa được hỗ trợ ở phiên bản hiện tại (mới hỗ trợ "chỉ nghỉ bù")';
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
