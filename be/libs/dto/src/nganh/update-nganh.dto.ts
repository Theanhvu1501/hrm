import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import type { Glossary } from '@app/entities';

export class UpdateNganhDto {
  @IsString()
  @IsOptional()
  name?: string;

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
