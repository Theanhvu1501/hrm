import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateDiemDanhAnDto {
  @IsDateString() ngay: string;
  @IsString() @IsNotEmpty() lopMa: string;
  @IsString() @IsNotEmpty() lopTen: string;
  @IsString() @IsOptional() goiAnMa?: string;
  @IsNumber() soTreDangKy: number;
  @IsNumber() soTreAnThucTe: number;
  @IsString() @IsOptional() congThucCode?: string;
  @IsString() @IsOptional() ghiChu?: string;
}
