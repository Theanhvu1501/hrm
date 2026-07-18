import { IsNumber, IsString, Min } from 'class-validator';

export class SetDayDto {
  @IsNumber()
  @Min(1)
  ngay: number;

  // '' clears the day's symbol (removes the chiTietNgay entry).
  @IsString()
  kyHieu: string;
}
