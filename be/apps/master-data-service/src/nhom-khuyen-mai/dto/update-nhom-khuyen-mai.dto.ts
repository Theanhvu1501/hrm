import { PartialType } from '@nestjs/mapped-types';
import { CreateNhomKhuyenMaiDto } from './create-nhom-khuyen-mai.dto';

export class UpdateNhomKhuyenMaiDto extends PartialType(
  CreateNhomKhuyenMaiDto,
) {}
