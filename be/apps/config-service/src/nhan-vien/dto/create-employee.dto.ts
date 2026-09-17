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
import { ChuanHoaChuoi } from '@app/core';
import type {
  BangCap,
  NguoiPhuThuoc,
  LienHeKhanCap,
  CanCuBHXH,
} from '@app/entities';

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
  @IsIn(['MUC_KHAI_BAO', 'LUONG_THOA_THUAN', 'LUONG_VA_PHU_CAP'])
  bhxhCanCu?: CanCuBHXH;
}

export class CreateEmployeeDto {
  @ChuanHoaChuoi()
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  hoTen: string;

  @ChuanHoaChuoi()
  @IsString()
  @IsNotEmpty({ message: 'CCCD không được để trống' })
  cccd: string;

  // Hai trường này in thẳng lên hợp đồng lao động. Optional vì hồ sơ cũ
  // chưa có, và HR có thể chưa cầm bản CCCD lúc tạo hồ sơ.
  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  ngayCapCccd?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  noiCapCccd?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  ngaySinh?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsIn(['nam', 'nu', 'khac'], { message: 'Giới tính không hợp lệ' })
  gioiTinh?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  mst?: string;

  /** Số sổ BHXH — dùng cho bảng khai báo lao động với cơ quan bảo hiểm. */
  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  soSoBH?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  soDienThoai?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  diaChi?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  chucDanh?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  ngayVaoLam?: string;

  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  ngayChinhThuc?: string;

  @IsOptional()
  @IsIn(['thu_viec', 'chinh_thuc', 'dich_vu'], {
    message: 'Loại hợp đồng không hợp lệ',
  })
  @ChuanHoaChuoi()
  loaiHopDong?: string;

  @IsOptional()
  @IsIn(['dang_lam_viec', 'da_nghi', 'tam_nghi'], {
    message: 'Trạng thái không hợp lệ',
  })
  @ChuanHoaChuoi()
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

  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  userId?: string;

  @ChuanHoaChuoi()
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

  /**
   * Số tiền riêng theo từng khoản lương, khoá theo `ma` khoản. Giá trị 0 là
   * HỢP LỆ và mang nghĩa "người này không có khoản đó" — khác hẳn với việc
   * không gửi khoá lên (ăn mức chung công ty).
   *
   * Phải khai ở đây: `main.ts` bật `forbidNonWhitelisted`, thiếu là cả form
   * 400 chứ không phải bị bỏ qua im lặng.
   */
  @IsOptional()
  @IsObject()
  giaTriKhoan?: Record<string, number>;

  @IsOptional()
  @IsInt()
  @Min(0)
  soNguoiPhuThuoc?: number;

  @IsOptional()
  @IsBoolean()
  dongBH?: boolean;

  /**
   * Thời điểm báo tăng bảo hiểm ("YYYY-MM-DD"). Thiếu khai ở đây là cả form
   * 400 vì `main.ts` bật `forbidNonWhitelisted`.
   */
  @ChuanHoaChuoi()
  @IsOptional()
  @IsString()
  ngayBatDauDongBH?: string;

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
