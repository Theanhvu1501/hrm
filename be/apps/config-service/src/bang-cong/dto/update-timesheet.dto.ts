import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTimesheetDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  soNgayCong?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  soGioLamThem?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  soLanDiMuon?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  soLanVeSom?: number;

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
