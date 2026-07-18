import { IsString, IsNotEmpty } from 'class-validator';

export class SelectTenantDto {
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;
}
