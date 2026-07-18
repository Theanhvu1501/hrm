import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChiTietDeXuatDto {
  @IsNumber() stt: number;
  @IsString() @IsNotEmpty() hangHoaMa: string;
  @IsString() @IsNotEmpty() hangHoaTen: string;
  @IsString() @IsOptional() donViTinh?: string;
  @IsNumber() soLuong: number;
  @IsNumber() donGia: number;
  @IsNumber() thanhTien: number;
}

export class CreateDeXuatMuaDto {
  @IsDateString() ngayDeXuat: string;
  @IsString() @IsOptional() nguoiDeXuat?: string;
  @IsString() @IsOptional() doiTuongMa?: string;
  @IsString() @IsOptional() doiTuongTen?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChiTietDeXuatDto)
  chiTiet: ChiTietDeXuatDto[];
  @IsNumber() @IsOptional() tongTien?: number;
}
