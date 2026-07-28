import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class DieuChinhQuyDto {
  // Chủ quỹ phải gửi kèm để service đối chiếu với `LeaveBalance.employeeId` —
  // `layQuyTheoId` ném ForbiddenException khi lệch. Không có nó thì HR gõ nhầm
  // một `balanceId` là điều chỉnh vào quỹ của người khác mà không ai biết.
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  balanceId: string;

  /** Dương = cộng, âm = trừ. */
  @IsNumber()
  soNgay: number;

  // Bắt buộc ở cả DTO lẫn service: đây là đường duy nhất đổi quỹ mà không có
  // sự kiện nghiệp vụ đứng sau.
  @IsString()
  @IsNotEmpty({ message: 'Điều chỉnh quỹ phép bắt buộc phải có ghi chú' })
  ghiChu: string;
}
