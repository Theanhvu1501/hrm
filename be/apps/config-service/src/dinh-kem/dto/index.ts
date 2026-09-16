import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * `main.ts` bật `forbidNonWhitelisted` — mọi trường FE gửi lên PHẢI có mặt ở
 * đây, thiếu một cái là cả request 400 chứ không phải bị bỏ qua im lặng.
 */
export class TimDinhKemDto {
  @IsString() @IsNotEmpty() doiTuong: string;
  @IsString() @IsNotEmpty() doiTuongId: string;
  @IsOptional() @IsString() nhom?: string;
  @IsOptional() @IsString() khoaPhu?: string;
}

export class TaiDinhKemDto {
  @IsString() @IsNotEmpty() doiTuong: string;
  @IsString() @IsNotEmpty() doiTuongId: string;
  @IsString() @IsNotEmpty() nhom: string;
  @IsOptional() @IsString() khoaPhu?: string;
}

export class GanDinhKemDto {
  @IsString() @IsNotEmpty() doiTuong: string;
  @IsString() @IsNotEmpty() tuId: string;
  @IsString() @IsNotEmpty() sangId: string;
}
