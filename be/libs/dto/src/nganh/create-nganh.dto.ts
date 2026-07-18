import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, Matches } from 'class-validator';
import type { Glossary } from '@app/entities';

export class CreateNganhDto {
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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  glossary?: Glossary;
}
