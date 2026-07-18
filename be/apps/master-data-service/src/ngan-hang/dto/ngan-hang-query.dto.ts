import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '@app/dto';

export enum NganHangLoai {
  TIEN_MAT = 'TIEN_MAT',
  NGAN_HANG = 'NGAN_HANG',
}

export class NganHangQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(NganHangLoai)
  loai?: NganHangLoai;
}
