import { PartialType } from '@nestjs/mapped-types';
import { CreateQuaTrinhCongTacDto } from './create-qua-trinh-cong-tac.dto';

export class UpdateQuaTrinhCongTacDto extends PartialType(
  CreateQuaTrinhCongTacDto,
) {}
