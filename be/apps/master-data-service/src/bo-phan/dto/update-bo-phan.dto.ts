import { PartialType } from '@nestjs/mapped-types';
import { CreateBoPhanDto } from './create-bo-phan.dto';

export class UpdateBoPhanDto extends PartialType(CreateBoPhanDto) {}
