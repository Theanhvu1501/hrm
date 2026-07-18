import { PartialType } from '@nestjs/mapped-types';
import { CreateCaLamViecDto } from './create-ca-lam-viec.dto';

export class UpdateCaLamViecDto extends PartialType(CreateCaLamViecDto) {}
