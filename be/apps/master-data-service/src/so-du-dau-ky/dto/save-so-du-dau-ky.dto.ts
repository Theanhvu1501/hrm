import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SoDuDauKyItemDto {
  @IsString()
  maTaiKhoan: string;

  @IsNumber()
  duNo: number;

  @IsNumber()
  duCo: number;

  @IsString()
  @IsOptional()
  chiTietType?: string;

  @IsString()
  @IsOptional()
  chiTietId?: string;

  @IsString()
  @IsOptional()
  chiTietMa?: string;

  @IsString()
  @IsOptional()
  chiTietTen?: string;

  @IsString()
  @IsOptional()
  nganHang?: string;
}

export class SaveSoDuDauKyDto {
  @IsDateString()
  ngayApDung: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SoDuDauKyItemDto)
  items: SoDuDauKyItemDto[];
}
