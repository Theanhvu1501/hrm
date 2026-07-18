import { PartialType } from '@nestjs/mapped-types';
import { CreateNhomVatTuDto } from './create-nhom-vat-tu.dto';

export class UpdateNhomVatTuDto extends PartialType(CreateNhomVatTuDto) {}
