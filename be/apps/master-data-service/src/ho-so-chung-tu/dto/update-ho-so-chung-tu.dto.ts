import { PartialType } from '@nestjs/mapped-types';
import { CreateHoSoChungTuDto } from './create-ho-so-chung-tu.dto';

export class UpdateHoSoChungTuDto extends PartialType(CreateHoSoChungTuDto) {}
