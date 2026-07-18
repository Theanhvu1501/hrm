import { PartialType } from '@nestjs/mapped-types';
import { CreateNhomKhoanMucDto } from './create-nhom-khoan-muc.dto';

export class UpdateNhomKhoanMucDto extends PartialType(CreateNhomKhoanMucDto) {}
