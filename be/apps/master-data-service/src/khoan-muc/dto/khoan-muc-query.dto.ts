import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '@app/dto';

export enum KhoanMucLoai {
  CHI_PHI = 'CHI_PHI',
  DOANH_THU = 'DOANH_THU',
}

export class KhoanMucQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(KhoanMucLoai)
  loai?: KhoanMucLoai;
}
