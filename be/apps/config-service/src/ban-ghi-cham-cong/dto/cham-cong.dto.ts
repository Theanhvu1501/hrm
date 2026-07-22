import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
  Matches,
} from 'class-validator';

export class ChamCongDto {
  @IsString()
  @IsNotEmpty({ message: 'Thiếu định danh thiết bị' })
  deviceId: string;

  @IsIn(['gps', 'wifi', 'qr'], {
    message: 'Phương thức chấm công phải là gps, wifi hoặc qr',
  })
  phuongThuc: 'gps' | 'wifi' | 'qr';

  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsNumber() doChinhXacMet?: number;
  @IsOptional() @IsString() maQr?: string;
  @IsOptional() @IsString() tenThietBi?: string;

  // CỐ Ý không có trường thời điểm. Thời điểm luôn lấy từ đồng hồ máy chủ
  // — nhận từ client thì chỉ cần chỉnh giờ điện thoại là chấm đúng giờ
  // mọi lúc.
}

export class HrNhapChamCongDto {
  @IsString()
  @IsNotEmpty({ message: 'Thiếu nhân viên' })
  employeeId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày phải có định dạng YYYY-MM-DD',
  })
  ngay: string;

  @IsIn(['vao', 'ra'], { message: 'Loại phải là vao hoặc ra' })
  loai: 'vao' | 'ra';

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Giờ phải có định dạng HH:mm',
  })
  gio: string;

  @IsOptional() @IsString() ghiChu?: string;
}
