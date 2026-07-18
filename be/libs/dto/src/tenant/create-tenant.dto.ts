import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches, IsEmail, ValidateNested, IsMongoId, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class TenantAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  hoTen: string;

  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang',
  })
  slug: string;

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

  // Lĩnh vực (module) công ty được cấp, vd ['KE_TOAN','KHO']. Mặc định ['KE_TOAN'].
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modules?: string[];

  // Ngành công ty thuộc về (vd 'XAY_DUNG'). Clone glossary của ngành vào tenant.
  @IsString()
  @IsOptional()
  nganh?: string;

  @ValidateNested()
  @Type(() => TenantAdminDto)
  @IsOptional()
  admin?: TenantAdminDto;

  @IsMongoId()
  @IsOptional()
  adminUserId?: string; // Use existing user as admin
}
