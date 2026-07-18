import { PartialType } from '@nestjs/mapped-types';
import { CreateNhomQuanLyDto } from './create-nhom-quan-ly.dto';

export class UpdateNhomQuanLyDto extends PartialType(CreateNhomQuanLyDto) {}
