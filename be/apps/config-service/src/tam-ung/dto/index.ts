import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

/**
 * `main.ts` bật `forbidNonWhitelisted` — trường không khai ở đây mà lọt vào
 * body là 400 cho CẢ form.
 */
export class CreateTamUngDto {
  /**
   * Bỏ trống = tự ứng cho CHÍNH MÌNH (đường tự phục vụ). Chỉ người có quyền
   * quản trị tạm ứng mới được lập đơn hộ người khác — kiểm ở controller.
   */
  @IsOptional()
  @IsString()
  employeeId?: string;

  @Matches(/^\d{4}-\d{2}$/, { message: 'Kỳ lương phải có định dạng YYYY-MM' })
  thang: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày đề nghị phải có định dạng YYYY-MM-DD',
  })
  ngayDeNghi: string;

  @IsInt({ message: 'Số tiền phải là số nguyên đồng' })
  @Min(1, { message: 'Số tiền tạm ứng phải lớn hơn 0' })
  soTien: number;

  @IsString()
  @IsNotEmpty({ message: 'Nêu lý do tạm ứng' })
  lyDo: string;

  @IsOptional()
  @IsString()
  ghiChu?: string;
}

export class DuyetTamUngDto {
  @Matches(/^(da_duyet|tu_choi)$/, {
    message: 'Trạng thái duyệt không hợp lệ',
  })
  trangThai: 'da_duyet' | 'tu_choi';

  /** Bắt buộc khi từ chối — người nộp phải biết vì sao. */
  @IsOptional()
  @IsString()
  lyDoTuChoi?: string;
}
