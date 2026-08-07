import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

/** Một dòng trong file import: mã nhân viên + số của từng khoản nhập tay. */
export class DongImportNhapTheoKyDto {
  @IsString()
  @IsNotEmpty({ message: 'Thiếu mã nhân viên' })
  maNhanVien: string;

  /**
   * Khoá theo `ma` khoản (vd `{ HIEU_SUAT: 2000000 }`). Kiểm mã hợp lệ và
   * kiểu số nằm ở service để còn BÁO CÁO từng dòng thay vì 400 cả file — một
   * ô sai không được làm hỏng cả lượt import.
   */
  @IsObject()
  giaTri: Record<string, number>;
}

export class ImportNhapTheoKyDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'Tháng phải có định dạng YYYY-MM' })
  thang: string;

  /**
   * Trần 2000 dòng: chặn một file khổng lồ khoá tiến trình trong khi công ty
   * đông nhất cũng chỉ vài trăm người mỗi kỳ.
   */
  @IsArray()
  @ArrayMaxSize(2000, { message: 'File quá lớn (tối đa 2000 dòng)' })
  @ValidateNested({ each: true })
  @Type(() => DongImportNhapTheoKyDto)
  dong: DongImportNhapTheoKyDto[];
}
