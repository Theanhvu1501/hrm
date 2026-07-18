import { IsOptional, IsString, IsEnum, IsMongoId } from 'class-validator';
import { PaginationQueryDto } from '@app/dto';
import { TrangThaiHopDong } from '@app/entities/master-data/hop-dong.entity';

export class HopDongQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TrangThaiHopDong)
  declare trangThai?: TrangThaiHopDong;

  @IsOptional()
  @IsMongoId()
  doiTuongId?: string;
}
