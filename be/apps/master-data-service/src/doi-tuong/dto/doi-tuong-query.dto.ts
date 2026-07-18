import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '@app/dto';
import { DoiTuongType } from '@app/entities';

export class DoiTuongQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DoiTuongType)
  loai?: DoiTuongType;
}
