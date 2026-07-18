import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDonViTinhDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
