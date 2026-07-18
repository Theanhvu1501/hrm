import { PartialType } from '@nestjs/mapped-types';
import { CreateDeXuatMuaDto } from './create-de-xuat-mua.dto';

export class UpdateDeXuatMuaDto extends PartialType(CreateDeXuatMuaDto) {}
