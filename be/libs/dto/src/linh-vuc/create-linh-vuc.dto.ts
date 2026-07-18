import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsInt, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateLinhVucDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, { message: 'Code chỉ gồm chữ HOA, số và gạch dưới' })
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsInt()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  menuKeys?: string[];

  @IsOptional()
  glossary?: Record<string, { label?: string; surfaces?: Record<string, string> }>;
}
