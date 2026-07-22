import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  Matches,
} from 'class-validator';

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateNgayLeDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên ngày lễ không được để trống' })
  ten: string;

  @Matches(NGAY_RE, { message: 'Từ ngày phải có định dạng YYYY-MM-DD' })
  tuNgay: string;

  @Matches(NGAY_RE, { message: 'Đến ngày phải có định dạng YYYY-MM-DD' })
  denNgay: string;

  @IsOptional()
  @IsIn(['le', 'nghi_cty'], {
    message: 'Loại ngày lễ phải là le hoặc nghi_cty',
  })
  loai?: string;

  @IsOptional()
  @IsBoolean()
  huongLuong?: boolean;

  @IsOptional()
  @IsString()
  moTa?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
