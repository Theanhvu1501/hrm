import { PartialType } from '@nestjs/mapped-types';
import { CreateDoiTuongDto } from './create-doi-tuong.dto';

export class UpdateDoiTuongDto extends PartialType(CreateDoiTuongDto) {}
