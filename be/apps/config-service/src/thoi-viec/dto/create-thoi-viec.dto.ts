import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChecklistBanGiaoItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Nội dung bàn giao không được để trống' })
  noiDung: string;

  @IsBoolean()
  hoanThanh: boolean;
}

export class CreateThoiViecDto {
  @IsString()
  @IsNotEmpty({ message: 'Nhân viên không được để trống' })
  employeeId: string;

  @IsString()
  @IsNotEmpty({ message: 'Ngày nộp đơn không được để trống' })
  ngayNopDon: string;

  @IsIn(['tu_nguyen', 'ky_luat', 'het_han_hd', 'khac'], {
    message: 'Loại thôi việc không hợp lệ',
  })
  loaiThoiViec: string;

  @IsOptional()
  @IsString()
  ngayLamViecCuoi?: string;

  @IsOptional()
  @IsString()
  lyDo?: string;

  @IsOptional()
  @IsString()
  viPham?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistBanGiaoItemDto)
  checklistBanGiao?: ChecklistBanGiaoItemDto[];

  @IsOptional()
  @IsString()
  soQuyetDinh?: string;

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
