import { PartialType } from '@nestjs/mapped-types';
import { CreateBangKeBanRaDto } from './create-bang-ke-ban-ra.dto';

export class UpdateBangKeBanRaDto extends PartialType(CreateBangKeBanRaDto) {}
