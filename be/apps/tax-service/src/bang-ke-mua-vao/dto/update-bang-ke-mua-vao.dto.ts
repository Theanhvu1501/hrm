import { PartialType } from '@nestjs/mapped-types';
import { CreateBangKeMuaVaoDto } from './create-bang-ke-mua-vao.dto';

export class UpdateBangKeMuaVaoDto extends PartialType(CreateBangKeMuaVaoDto) {}
