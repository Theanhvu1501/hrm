import { PartialType } from '@nestjs/mapped-types';
import { CreateLoaiChungTuDto } from './create-loai-chung-tu.dto';

export class UpdateLoaiChungTuDto extends PartialType(CreateLoaiChungTuDto) {}
