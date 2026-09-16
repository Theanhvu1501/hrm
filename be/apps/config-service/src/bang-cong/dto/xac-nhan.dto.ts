import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** Gửi bảng công cả tháng cho nhân viên xác nhận (yêu cầu d19). */
export class GuiXacNhanDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'Tháng phải có định dạng YYYY-MM' })
  thang: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Hạn xác nhận phải có định dạng YYYY-MM-DD',
  })
  hanXacNhan: string;
}

/** Nhân viên phản hồi bảng công của chính mình. */
export class PhanHoiBangCongDto {
  /** `true` = xác nhận đúng; `false` = đề nghị điều chỉnh (phải kèm `yKien`). */
  @IsBoolean()
  dongY: boolean;

  @IsOptional()
  @IsString()
  // Chặn ở đây thay vì để một đoạn văn 50KB đi thẳng vào DB rồi tràn cột hiển
  // thị của C&B.
  @MaxLength(2000, { message: 'Ý kiến tối đa 2000 ký tự' })
  yKien?: string;
}
