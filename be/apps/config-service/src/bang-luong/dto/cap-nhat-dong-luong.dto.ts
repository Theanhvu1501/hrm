import { IsNumber, IsObject, IsOptional } from 'class-validator';

export class CapNhatDongLuongDto {
  @IsOptional() @IsObject() nhapTheoKy?: Record<string, number>;
  @IsOptional() @IsNumber() tamUng?: number;
  @IsOptional() @IsNumber() khauTruKhac?: number;
}
