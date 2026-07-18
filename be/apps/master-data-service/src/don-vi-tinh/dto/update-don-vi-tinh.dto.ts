import { PartialType } from '@nestjs/mapped-types';
import { CreateDonViTinhDto } from './create-don-vi-tinh.dto';

export class UpdateDonViTinhDto extends PartialType(CreateDonViTinhDto) {}
