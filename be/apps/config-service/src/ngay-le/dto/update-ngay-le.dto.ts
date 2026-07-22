import { PartialType } from '@nestjs/mapped-types';
import { CreateNgayLeDto } from './create-ngay-le.dto';

export class UpdateNgayLeDto extends PartialType(CreateNgayLeDto) {}
