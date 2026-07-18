import { PartialType } from '@nestjs/mapped-types';
import { CreateTaiKhoanDto } from './create-tai-khoan.dto';

export class UpdateTaiKhoanDto extends PartialType(CreateTaiKhoanDto) {}
