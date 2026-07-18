import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { CreateBangKeMuaVaoDto } from './create-bang-ke-mua-vao.dto';

export class ImportBangKeMuaVaoDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateBangKeMuaVaoDto)
  items: CreateBangKeMuaVaoDto[];
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
