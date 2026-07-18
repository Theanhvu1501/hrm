import { IsEmail, IsString, IsArray, ValidateNested, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UserStatus } from '@app/entities';

export class UserTenantDto {
  @IsString()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  role: string;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  hoTen: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserTenantDto)
  tenants: UserTenantDto[];

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(UserStatus)
  trangThai?: UserStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
