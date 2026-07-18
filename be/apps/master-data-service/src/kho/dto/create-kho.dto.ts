import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateKhoDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  diaChi?: string;

  @IsString()
  @IsOptional()
  thuKho?: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
