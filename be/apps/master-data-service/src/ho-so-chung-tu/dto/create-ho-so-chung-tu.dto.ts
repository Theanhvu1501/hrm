import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateHoSoChungTuDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsOptional()
  moTa?: string;
}
