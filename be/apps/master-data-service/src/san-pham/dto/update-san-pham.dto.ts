import { PartialType } from '@nestjs/mapped-types';
import { CreateSanPhamDto } from './create-san-pham.dto';

export class UpdateSanPhamDto extends PartialType(CreateSanPhamDto) {}
