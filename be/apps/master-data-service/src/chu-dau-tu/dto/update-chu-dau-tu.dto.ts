import { PartialType } from '@nestjs/mapped-types';
import { CreateChuDauTuDto } from './create-chu-dau-tu.dto';

export class UpdateChuDauTuDto extends PartialType(CreateChuDauTuDto) {}
