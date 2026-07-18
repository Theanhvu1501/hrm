import { IsObject, IsOptional } from 'class-validator';
import type { Glossary } from '@app/entities';

export class UpdateTenantGlossaryDto {
  @IsObject()
  @IsOptional()
  glossary?: Glossary;
}
