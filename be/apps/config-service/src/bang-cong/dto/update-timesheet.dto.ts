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

  // Thiếu 2 trường này thì `forbidNonWhitelisted` (main.ts) từ chối cả form
  // khi client gửi lại nguyên `chiTietNgay` đọc từ GET (đã có nguon/canhBao
  // do generate() điền) — chứ không phải vì update() cần đọc chúng: update()
  // hiện gán thẳng cả mảng, nên thiếu khai báo ở đây sẽ bóc mất `nguon` của
  // MỌI ô tu_dong (coi như hr_sua) trong lần lưu kế tiếp — một lần lưu lưới
  // hàng loạt sẽ đóng băng âm thầm cả tháng với mọi lần generate() sau.
  @IsOptional()
  @IsString()
  nguon?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  canhBao?: string[];
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
