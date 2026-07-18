import { PartialType } from '@nestjs/mapped-types';
import { CreateNganHangDto } from './create-ngan-hang.dto';

export class UpdateNganHangDto extends PartialType(CreateNganHangDto) {}
