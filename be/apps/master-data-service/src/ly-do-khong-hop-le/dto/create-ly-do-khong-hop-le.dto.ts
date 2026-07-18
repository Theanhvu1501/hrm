import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLyDoKhongHopLeDto {
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
