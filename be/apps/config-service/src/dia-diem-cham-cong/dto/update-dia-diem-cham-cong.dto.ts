import { PartialType } from '@nestjs/mapped-types';
import { CreateDiaDiemChamCongDto } from './create-dia-diem-cham-cong.dto';

export class UpdateDiaDiemChamCongDto extends PartialType(
  CreateDiaDiemChamCongDto,
) {}
