import { PartialType } from '@nestjs/mapped-types';
import { CreateDonChamCongDto } from './create-don-cham-cong.dto';

export class UpdateDonChamCongDto extends PartialType(CreateDonChamCongDto) {}
