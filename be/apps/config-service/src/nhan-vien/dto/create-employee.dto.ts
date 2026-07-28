import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
  IsArray,
  IsObject,
  IsInt,
  IsBoolean,
  IsNumber,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { BangCap, NguoiPhuThuoc, LienHeKhanCap } from '@app/entities';

/**
 * Override cấu hình lương cho riêng một NV. Trường vắng mặt = kế thừa
 * `CauHinhLuong` của công ty (xem `ganCauHinhRieng`). Tỷ lệ lưu 0..1.
 */
export class CauHinhLuongRiengDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  congChuan?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  thuViecTyLe?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  bhxhTyLe?: number;

  @IsOptional()
  @IsIn(['MUC_KHAI_BAO', 'LUONG_THOA_THUAN'])
  bhxhCanCu?: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN';
}

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  hoTen: string;

  @IsString()
  @IsNotEmpty({ message: 'CCCD không được để trống' })
  cccd: string;

  @IsOptional()
  @IsString()
  ngaySinh?: string;

  @IsOptional()
  @IsIn(['nam', 'nu', 'khac'], { message: 'Giới tính không hợp lệ' })
  gioiTinh?: string;

  @IsOptional()
  @IsString()
  mst?: string;

  @IsOptional()
  @IsString()
  soDienThoai?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString()
  diaChi?: string;

  @IsOptional()
  @IsString()
  phongBan?: string;

  @IsOptional()
  @IsString()
  chucDanh?: string;

  @IsOptional()
  @IsString()
  ngayVaoLam?: string;

  @IsOptional()
  @IsString()
  ngayChinhThuc?: string;

  @IsOptional()
  @IsIn(['thu_viec', 'chinh_thuc', 'dich_vu'], {
    message: 'Loại hợp đồng không hợp lệ',
  })
  loaiHopDong?: string;

  @IsOptional()
  @IsIn(['dang_lam_viec', 'da_nghi', 'tam_nghi'], {
    message: 'Trạng thái không hợp lệ',
  })
  trangThai?: string;

  @IsOptional()
  @IsArray()
  bangCap?: BangCap[];

  @IsOptional()
  @IsArray()
  nguoiPhuThuoc?: NguoiPhuThuoc[];

  @IsOptional()
  @IsObject()
  lienHeKhanCap?: LienHeKhanCap;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  workShiftId?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  ngayLamViecTrongTuan?: number[];

  @IsOptional()
  @IsBoolean()
  choPhepChamNgoaiVung?: boolean;

  // ── Lương (P4-A) ──
  // Entity + FE đã có 7 trường này từ P4-A nhưng DTO thì chưa: thiếu ở đây là
  // 400 thẳng cho cả POST và PUT, vì `main.ts` bật `forbidNonWhitelisted`.
  // Tab "Lương" trong Hồ sơ NV vì thế không lưu được gì cho tới khi có khai
  // báo này — xem describe tương ứng trong `create-employee.dto.spec.ts`.
  @IsOptional()
  @IsNumber()
  @Min(0)
  luongThoaThuan?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mucKhaiBao?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  phuCapCoDinh?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  soNguoiPhuThuoc?: number;

  @IsOptional()
  @IsBoolean()
  dongBH?: boolean;

  @IsOptional()
  @IsBoolean()
  thoiVu?: boolean;

  @IsOptional()
  @IsBoolean()
  camKet?: boolean;

  // ── Lương (P4.1) ──
  /**
   * HĐLĐ thứ 2: NLĐ không đóng BH tại đây, không giảm trừ gia cảnh tại đây,
   * công ty chỉ chịu BHTNLĐ-BNN (`bhCongTy.tyLeHopDongThu2`).
   */
  @IsOptional()
  @IsBoolean()
  hopDongThu2?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CauHinhLuongRiengDto)
  cauHinhLuongRieng?: CauHinhLuongRiengDto;
}
