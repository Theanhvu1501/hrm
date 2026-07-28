import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Dùng cho cả `cap-dau-nam` và `dong-quy`. Phải là class thật (không inline
 * type) thì ValidationPipe toàn cục mới có metatype để validate.
 */
export class ThaoTacNamDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  nam: number;

  /** true = chỉ trả bảng xem trước, KHÔNG ghi gì. */
  @IsOptional()
  @IsBoolean()
  xemTruoc?: boolean;
}
