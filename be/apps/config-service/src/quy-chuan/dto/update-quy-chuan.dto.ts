import { PartialType } from '@nestjs/mapped-types';
import { CreateQuyChuan_Dto } from './create-quy-chuan.dto';

export class UpdateQuyChuan_Dto extends PartialType(CreateQuyChuan_Dto) {}
