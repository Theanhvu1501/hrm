import { IsNumber, IsObject, IsOptional, Min } from 'class-validator';

/**
 * Kế toán sửa SỐ GIỜ từng loại, KHÔNG sửa thẳng thành tiền — thành tiền là kết
 * quả tính lại từ giờ × đơn giá × hệ số. Cho sửa tiền trực tiếp là mở đường
 * cho một con số không giải thích được bằng bất kỳ phép tính nào, trên một
 * biểu mẫu có chỗ ký của kế toán và giám đốc.
 */
export class CapNhatDongThemGioDto {
  /** `{ ngay_thuong: 10, ngay_dem: 4 }` — khoá là mã loại ngày, giá trị là GIỜ. */
  @IsOptional() @IsObject() theoLoai?: Record<string, number>;

  @IsOptional() @IsNumber() @Min(0) gioNghiBu?: number;
}
