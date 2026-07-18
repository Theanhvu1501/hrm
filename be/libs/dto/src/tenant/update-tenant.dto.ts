import { IsString, IsOptional, IsBoolean, IsEmail, Matches, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang',
  })
  slug?: string;

  @IsString()
  @IsOptional()
  maSoThue?: string;

  @IsString()
  @IsOptional()
  diaChi?: string;

  @IsString()
  @IsOptional()
  dienThoai?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  nguoiDaiDien?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Lĩnh vực (module) công ty được cấp, vd ['KE_TOAN','KHO'].
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modules?: string[];

  @IsString()
  @IsOptional()
  nganh?: string;
}
