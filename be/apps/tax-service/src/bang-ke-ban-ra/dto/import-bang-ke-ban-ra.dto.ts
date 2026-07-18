import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { CreateBangKeBanRaDto } from './create-bang-ke-ban-ra.dto';

export class ImportBangKeBanRaDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateBangKeBanRaDto)
  items: CreateBangKeBanRaDto[];
}

export class DuplicateKeyDto {
  @IsString()
  @IsNotEmpty()
  soHoaDon: string;

  @IsString()
  @IsOptional()
  kyHieuHoaDon?: string;

  @IsString()
  @IsOptional()
  mst?: string;
}

export class CheckDuplicatesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DuplicateKeyDto)
  keys: DuplicateKeyDto[];
}
