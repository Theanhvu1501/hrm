import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChiTietNgayDto {
  @IsNumber()
  @Min(1)
  ngay: number;

  @IsString()
  kyHieu: string;
}

export class UpdateTimesheetDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  soNgayCong?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChiTietNgayDto)
  chiTietNgay?: ChiTietNgayDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  soGioLamThem?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  soLanDiMuon?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  soLanVeSom?: number;

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
