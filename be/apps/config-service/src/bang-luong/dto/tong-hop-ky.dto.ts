import { Matches } from 'class-validator';

export class TongHopKyDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'Tháng phải có định dạng YYYY-MM' })
  thang: string;
}
