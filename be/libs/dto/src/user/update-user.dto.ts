import { IsEmail, IsString, IsArray, ValidateNested, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UserStatus } from '@app/entities';
import { UserTenantDto } from './create-user.dto';

export class UpdateUserDto {
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  hoTen?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserTenantDto)
  tenants?: UserTenantDto[];

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(UserStatus)
  trangThai?: UserStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
