import { PartialType } from '@nestjs/mapped-types';
import { CreateLyDoKhongHopLeDto } from './create-ly-do-khong-hop-le.dto';

export class UpdateLyDoKhongHopLeDto extends PartialType(CreateLyDoKhongHopLeDto) {}
