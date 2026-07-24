import { IsArray, IsNumber, IsObject, IsOptional } from 'class-validator';
import type { KhoanLuong, BacThue } from '@app/entities';

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
  @IsOptional() @IsNumber() lamTron?: number;
}
