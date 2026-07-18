import { PartialType } from '@nestjs/mapped-types';
import { CreateDongTienDto } from './create-dong-tien.dto';

export class UpdateDongTienDto extends PartialType(CreateDongTienDto) {}
