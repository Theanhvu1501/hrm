import { IsOptional, IsInt, Min, Max, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ChungTuQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 15;

  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() doiTuong?: string;
  @IsOptional() @IsString() duAn?: string;
  @IsOptional() @IsString() boPhan?: string;
  @IsOptional() @IsString() taiKhoanNo?: string;
  @IsOptional() @IsString() taiKhoanCo?: string;
  // 'thu' | 'chi' — dùng bởi cash-flow-composition (whitelist để ValidationPipe không chặn).
  @IsOptional() @IsString() which?: string;
}
