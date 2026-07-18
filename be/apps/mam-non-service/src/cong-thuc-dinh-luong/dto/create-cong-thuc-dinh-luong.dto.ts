import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChiTietCongThucDto {
  @IsString()
  @IsNotEmpty()
  hangHoaMa: string;

  @IsString()
  @IsNotEmpty()
  hangHoaTen: string;

  @IsNumber()
  dinhLuong: number;

  @IsString()
  @IsOptional()
  donViTinh?: string;

  @IsString()
  @IsIn(['DINH_LUONG', 'THEO_SUAT'])
  cachXuat: string;
}

export class CreateCongThucDinhLuongDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  @IsIn(['SUAT_CHUAN', 'DO_TUOI', 'GOI_AN'])
  ganTheo?: string;

  @IsString()
  @IsOptional()
  doiTuongMa?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChiTietCongThucDto)
  chiTiet: ChiTietCongThucDto[];
}
