import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '@app/dto';
import { DuAnStatus } from '@app/entities';

export class DuAnQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DuAnStatus)
  declare trangThai?: DuAnStatus;
}
