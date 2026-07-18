import { PartialType } from '@nestjs/mapped-types';
import { CreateCongThucDinhLuongDto } from './create-cong-thuc-dinh-luong.dto';

export class UpdateCongThucDinhLuongDto extends PartialType(
  CreateCongThucDinhLuongDto,
) {}
