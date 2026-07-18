import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateNhomVatTuDto {
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
