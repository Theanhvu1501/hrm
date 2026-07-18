import { PartialType } from '@nestjs/mapped-types';
import { CreateKhoanMucDto } from './create-khoan-muc.dto';

export class UpdateKhoanMucDto extends PartialType(CreateKhoanMucDto) {}
