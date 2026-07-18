import { PartialType } from '@nestjs/mapped-types';
import { CreateDuAnDto } from './create-du-an.dto';

export class UpdateDuAnDto extends PartialType(CreateDuAnDto) {}
