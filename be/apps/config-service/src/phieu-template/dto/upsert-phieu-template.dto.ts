import { IsString, IsNotEmpty } from 'class-validator';

export class UpsertPhieuTemplateDto {
  @IsString()
  @IsNotEmpty()
  html: string;
}
