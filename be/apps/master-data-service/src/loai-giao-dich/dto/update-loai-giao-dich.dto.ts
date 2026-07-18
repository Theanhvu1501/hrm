import { PartialType } from '@nestjs/mapped-types';
import { CreateLoaiGiaoDichDto } from './create-loai-giao-dich.dto';

export class UpdateLoaiGiaoDichDto extends PartialType(CreateLoaiGiaoDichDto) {}
