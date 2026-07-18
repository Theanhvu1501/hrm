import { IsArray, IsString, IsOptional } from 'class-validator';

export class UpdateTenantDashboardDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dashboardBlocks?: string[];
}
