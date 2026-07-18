import { IsString, IsNotEmpty } from 'class-validator';

export class SelectTenantDto {
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export interface SelectTenantDTOs {
  SelectTenantDto: SelectTenantDto;
}

declare module '../dto' {
  interface DTOs extends SelectTenantDTOs {}
}
