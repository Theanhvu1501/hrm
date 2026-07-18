import { PartialType } from '@nestjs/mapped-types';
import { CreateKhoDto } from './create-kho.dto';

export class UpdateKhoDto extends PartialType(CreateKhoDto) {}
