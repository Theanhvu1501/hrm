import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsDate,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class QuyetToanHDDto {
  @IsOptional() @IsString() so?: string;
  @Transform(emptyToUndefined) @IsOptional() @Type(() => Date) @IsDate() ngay?: Date;
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() giaTri?: number;
}

export class BaoHanhTheoDoiDto {
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() giaTri?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsInt() soNgay?: number;
  @Transform(emptyToUndefined) @IsOptional() @Type(() => Date) @IsDate() ngayGiaiToaBL?: Date;
  @IsOptional() @IsString() trangThai?: string;
}

export class DotThanhToanDto {
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() tiLe?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() soTien?: number;
}

export class DotHoaDonDto {
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() soTien?: number;
}

export class TinhTrangHoSoDto {
  @IsOptional() @IsBoolean() hd?: boolean;
  @IsOptional() @IsBoolean() nt1?: boolean;
  @IsOptional() @IsBoolean() nt2?: boolean;
  @IsOptional() @IsBoolean() ntSuDung?: boolean;
  @IsOptional() @IsBoolean() thanhLy?: boolean;
  @Transform(emptyToUndefined) @IsOptional() @IsInt() namQuyetToan?: number;
}

export class UpsertTheoDoiHopDongDto {
  @IsOptional() @IsString() phuTrachHoSo?: string;
  @IsOptional() @IsString() trangThaiHoSo?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuyetToanHDDto)
  quyetToan?: QuyetToanHDDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BaoHanhTheoDoiDto)
  baoHanhTheoDoi?: BaoHanhTheoDoiDto;

  @Transform(emptyToUndefined) @IsOptional() @IsNumber() giamTru?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DotThanhToanDto)
  dotThanhToan?: DotThanhToanDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DotHoaDonDto)
  dotHoaDon?: DotHoaDonDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TinhTrangHoSoDto)
  tinhTrangHoSo?: TinhTrangHoSoDto;

  @IsOptional() @IsString() ghiChu?: string;
}
