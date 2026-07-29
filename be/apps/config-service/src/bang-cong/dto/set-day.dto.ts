import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SetDayDto {
  @IsNumber()
  @Min(1)
  @Max(31)
  ngay: number;

  // '' xoá ký hiệu của ngày đó (bỏ hẳn phần tử khỏi chiTietNgay).
  @IsString()
  kyHieu: string;

  /**
   * Trả ô về cho máy quản: xoá dấu `hr_sua` rồi tính lại đúng ngày này.
   * Dành cho HR sửa nhầm và muốn lùi lại mà không phải tổng hợp cả tháng.
   * Khi bật, `kyHieu` bị bỏ qua.
   */
  @IsOptional()
  @IsBoolean()
  veTuDong?: boolean;
}
