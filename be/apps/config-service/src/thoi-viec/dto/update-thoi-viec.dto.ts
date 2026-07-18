import { PartialType } from '@nestjs/mapped-types';
import { CreateThoiViecDto } from './create-thoi-viec.dto';

export class UpdateThoiViecDto extends PartialType(CreateThoiViecDto) {}
