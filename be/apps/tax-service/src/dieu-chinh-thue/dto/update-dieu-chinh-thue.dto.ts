import { IsArray, IsNumber, IsOptional } from 'class-validator';

// Mỗi field là mảng 4 phần tử (Q1..Q4).
export class UpdateDieuChinhThueDto {
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) cpkdtDichVuHangHoa?: number[];
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) cpkdtTscdCcdc?: number[];
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) cpkdtNhanCong?: number[];
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) cpkdtTaiChinhKhac?: number[];
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) thuNhapMienThue?: number[];
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) loDuocChuyen?: number[];
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) thueTNCN?: number[];
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) bhxh3383?: number[];
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) bhyt3384?: number[];
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) bhtn3386?: number[];
}
