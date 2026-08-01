import { IsOptional, Matches } from 'class-validator';

/** Body của `POST /quy-gio/dong-quy` — `den` rỗng nghĩa là dùng ngày hôm nay. */
export class DongQuyGioDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày phải có dạng YYYY-MM-DD' })
  den?: string;
}
