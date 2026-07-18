import { PartialType } from '@nestjs/mapped-types';
import { CreateDinhMucTienAnDto } from './create-dinh-muc-tien-an.dto';

export class UpdateDinhMucTienAnDto extends PartialType(
  CreateDinhMucTienAnDto,
) {}
