import { PartialType } from '@nestjs/mapped-types';
import { CreateDiemDanhAnDto } from './create-diem-danh-an.dto';
export class UpdateDiemDanhAnDto extends PartialType(CreateDiemDanhAnDto) {}
