import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChiTietNgayDto {
  // Cùng chặn `@Max(31)` với SetDayDto.ngay (Finding K review) — hai đường
  // ghi khác nhau (PATCH một ngày vs PUT nguyên khối chiTietNgay) không được
  // phép có hai hợp đồng validate khác nhau cho CÙNG một trường.
  @IsNumber()
  @Min(1)
  @Max(31)
  ngay: number;

  @IsString()
  kyHieu: string;

  // Thiếu 2 trường này thì `forbidNonWhitelisted` (main.ts) từ chối cả form
  // khi client gửi lại nguyên `chiTietNgay` đọc từ GET (đã có nguon/canhBao
  // do generate() điền) — chứ không phải vì update() cần đọc chúng: update()
  // hiện gán thẳng cả mảng, nên thiếu khai báo ở đây sẽ bóc mất `nguon` của
  // MỌI ô tu_dong (coi như hr_sua) trong lần lưu kế tiếp — một lần lưu lưới
  // hàng loạt sẽ đóng băng âm thầm cả tháng với mọi lần generate() sau.
  @IsOptional()
  @IsString()
  nguon?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  canhBao?: string[];
}

export class UpdateTimesheetDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  soNgayCong?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChiTietNgayDto)
  chiTietNgay?: ChiTietNgayDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  soGioLamThem?: number;

  // soLanDiMuon/soLanVeSom KHÔNG còn ở đây (Finding E review wave 2): spec
  // §5.3 đã chuyển hai cột này từ nhập tay sang tự tính (đếm số bản ghi có
  // soPhutDiMuon/soPhutVeSom > 0 trong tháng, xem generate() → nguon-thang.ts
  // demMuonSom()). Trước bản vá, DTO vẫn nhận hai trường này nên HR gõ tay
  // qua RowNoteEditor vẫn "sửa" được — giá trị đó sống sót cho tới lần Tổng
  // hợp kế tiếp rồi bị máy ghi đè không một cảnh báo nào. `whitelist: true` +
  // `forbidNonWhitelisted: true` (main.ts) tự khiến client gửi hai trường
  // này bị 400 — đúng ý: hai cột này không còn là input hợp lệ nữa.
  @IsOptional()
  @IsString()
  ghiChu?: string;
}
