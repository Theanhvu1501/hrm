import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
  IsObject,
  Min,
} from 'class-validator';

export class CreateQuaTrinhCongTacDto {
  @IsString()
  @IsNotEmpty({ message: 'Nhân viên không được để trống' })
  employeeId: string;

  /**
   * `doi_trang_thai`/`danh_gia` vẫn NHẬN được ở đây cho bản ghi cũ sửa lại,
   * nhưng FE không còn cho chọn mới (xem entity). `thoi_viec` do màn Thôi việc
   * tự sinh.
   */
  @IsIn(
    [
      'dieu_chuyen',
      'tang_luong',
      'bo_nhiem',
      'thoi_viec',
      'khac',
      'doi_trang_thai',
      'danh_gia',
    ],
    { message: 'Loại thay đổi không hợp lệ' },
  )
  loaiThayDoi: string;

  @IsString()
  @IsNotEmpty({ message: 'Ngày hiệu lực không được để trống' })
  ngayHieuLuc: string;

  /** id phòng ban mới trong danh mục identity. Lịch sử vẫn lưu TÊN, không lưu id. */
  @IsOptional()
  @IsString()
  departmentIdMoi?: string;

  @IsOptional()
  @IsString()
  chucDanhMoi?: string;

  @IsOptional()
  @IsIn(['dang_lam_viec', 'tam_nghi', 'da_nghi'], {
    message: 'Trạng thái không hợp lệ',
  })
  trangThaiMoi?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mucLuongMoi?: number;

  /** Mức riêng mới theo từng khoản lương, khoá là `ma` khoản. */
  @IsOptional()
  @IsObject()
  phuCapMoi?: Record<string, number>;

  /**
   * Id nháp mà các tệp chứng từ đã bám vào lúc form chưa lưu. Bắt buộc phải
   * có ít nhất một tệp (yêu cầu d13: "cho up kèm chứng từ (bắt buộc)") nên BE
   * đếm theo id này TRƯỚC khi ghi, rồi mới chuyển sang id thật.
   */
  @IsOptional()
  @IsString()
  idNhap?: string;

  @IsOptional()
  @IsString()
  soQuyetDinh?: string;

  @IsOptional()
  @IsString()
  lyDo?: string;

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
