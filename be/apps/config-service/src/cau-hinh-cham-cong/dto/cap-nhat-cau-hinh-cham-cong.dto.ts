import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 * `forbidNonWhitelisted` đang bật ở `main.ts` — trường nào không khai ở đây
 * mà lọt vào body là 400 cho CẢ form, không phải bỏ qua im lặng.
 */
export class CapNhatCauHinhChamCongDto {
  /** 0=CN … 6=T7. Cho phép mảng rỗng: đó là "HR cố ý bỏ trống". */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  ngayLamViecTrongTuan?: number[];

  /** Cho phép nhân viên tự khai "làm từ xa" khi bấm chấm công (yêu cầu d16). */
  @IsOptional()
  @IsBoolean()
  choPhepTuKhaiTuXa?: boolean;
}
