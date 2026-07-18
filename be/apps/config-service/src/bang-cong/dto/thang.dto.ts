import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ThangDto {
  @IsString()
  @IsNotEmpty({ message: 'Tháng không được để trống' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Tháng phải theo định dạng YYYY-MM',
  })
  thang: string;
}
