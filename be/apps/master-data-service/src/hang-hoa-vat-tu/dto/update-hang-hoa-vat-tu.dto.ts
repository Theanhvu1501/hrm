import { PartialType } from '@nestjs/mapped-types';
import { CreateHangHoaVatTuDto } from './create-hang-hoa-vat-tu.dto';

export class UpdateHangHoaVatTuDto extends PartialType(CreateHangHoaVatTuDto) {}
