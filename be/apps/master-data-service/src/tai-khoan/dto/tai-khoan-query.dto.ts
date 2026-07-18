import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/dto';

export class TaiKhoanQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  nhom?: string;
}
