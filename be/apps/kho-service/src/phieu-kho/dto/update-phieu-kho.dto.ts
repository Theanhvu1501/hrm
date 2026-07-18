import { PartialType } from '@nestjs/mapped-types';
import { CreatePhieuKhoDto } from './create-phieu-kho.dto';

export class UpdatePhieuKhoDto extends PartialType(CreatePhieuKhoDto) {}
