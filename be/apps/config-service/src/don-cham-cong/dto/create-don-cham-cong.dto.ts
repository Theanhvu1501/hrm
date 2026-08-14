import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateDonChamCongDto {
  @IsString()
  @IsNotEmpty({ message: 'Nhân viên không được để trống' })
  employeeId: string;

  // `lam_online` = làm việc ở nhà. Ngày có đơn này đã duyệt thì chấm công BỎ
  // đối chiếu vị trí (ban-ghi-cham-cong.service.ts) và bảng công ra ký hiệu
  // `OL` — 1 công, không tiền ăn ca.
  @IsIn(['giai_trinh', 'lam_them_gio', 'nghi_phep', 'nghi_bu', 'lam_online'], {
    message: 'Loại đơn không hợp lệ',
  })
  loaiDon: string;

  @IsString()
  @IsNotEmpty({ message: 'Ngày không được để trống' })
  ngay: string;

  // Ngày cuối của khoảng nghỉ (đơn nghi_phep/nghi_bu nhiều ngày). Không bắt
  // buộc vì đơn OT (lam_them_gio) và giai_trinh không dùng trường này.
  @IsOptional()
  @IsString()
  denNgay?: string;

  // ca_ngay|sang|chieu — chỉ có ý nghĩa khi đơn đúng 1 ngày (tuNgay = denNgay),
  // xem tinhSoNgayNghi() trong luat-don.ts. Đơn `lam_online` cũng dùng trường
  // này, nhưng CHỈ để hiển thị: nửa buổi online vẫn ra `OL` = 1 công và cũng
  // không có tiền ăn ca, y hệt online trọn ngày.
  @IsOptional()
  @IsIn(['ca_ngay', 'sang', 'chieu'], { message: 'Buổi không hợp lệ' })
  buoi?: string;

  // Loại nghỉ phép, chỉ dùng khi loaiDon là nghi_phep/nghi_bu.
  @IsOptional()
  @IsIn(
    ['phep_nam', 'khong_luong', 'om_dau', 'thai_san', 'cuoi_hoi', 'tang'],
    { message: 'Loại nghỉ không hợp lệ' },
  )
  loaiNghi?: string;

  // Chỉ đơn nghi_bu: nghỉ trọn ngày hay nghỉ lẻ giờ. KHAI TƯỜNG MINH — xem
  // docblock cùng tên trên entity vì sao không suy từ gioTu có rỗng hay không.
  @IsOptional()
  @IsIn(['theo_ngay', 'theo_gio'], { message: 'Kiểu nghỉ bù không hợp lệ' })
  kieuNghi?: string;

  // Chỉ đơn lam_them_gio, và chỉ có nghĩa khi công ty đặt chế độ bù là
  // nhan_vien_chon. Các chế độ khác backend tự quyết và bỏ qua giá trị này.
  @IsOptional()
  @IsIn(['tien', 'nghi_bu'], { message: 'Hình thức bù không hợp lệ' })
  hinhThucBu?: string;

  @IsOptional()
  @IsString()
  lyDo?: string;

  @IsOptional()
  @IsString()
  gioTu?: string;

  @IsOptional()
  @IsString()
  gioDen?: string;

  // Cố ý KHÔNG có soNgayNghi/soGioOt/heSoOt/loaiNgayOt/phanBoQuy/soGioNghiBu/
  // phanBoQuyGio ở đây — đây là các trường BACKEND TỰ TÍNH (Task 3 và Task 6,
  // dùng luat-don.ts), không nhận từ client. Nhận từ client là mở đường cho
  // người nộp đơn tự khai số ngày nghỉ, tự khai hệ số OT (ví dụ khai heSoOt =
  // 3.0 cho ngày thường), hoặc tự khai số giờ nghỉ bù của chính mình.
  // phanBoQuy (P3.8) / phanBoQuyGio (Task 6) được backend ghi lúc tạo đơn để
  // snapshot quỹ được sử dụng. Cùng lý do, KHÔNG thêm nguoiDuyetId/
  // thoiDiemDuyet: đó là vết duyệt do luồng phê duyệt ghi, không phải điều
  // người nộp đơn tự khai.

  @IsOptional()
  @IsString()
  minhChung?: string;

  // Giữ field này (thay vì xoá hẳn) để không phá TaoDonCuaToiDto (OmitType
  // đang loại 'trangThai' khỏi danh sách field CÓ trên lớp này) và để pipe
  // validation không chặn nhầm client cũ còn gửi kèm. Nhưng từ Task 4, giá
  // trị này BỊ BỎ QUA HOÀN TOÀN ở DonChamCong_Service.create() — đơn luôn
  // được tạo ở 'cho_duyet', bất kể ai gửi gì ở đây (xem comment trong
  // service). Lý do: design spec §3 câu hỏi 7 — HR được nộp hộ đơn cho
  // người khác, nhưng đơn vẫn phải qua một bước duyệt riêng để lại vết, không
  // được tạo thẳng ra ở trạng thái đã duyệt.
  @IsOptional()
  @IsIn(['cho_duyet', 'da_duyet', 'tu_choi'], {
    message: 'Trạng thái không hợp lệ',
  })
  trangThai?: string;

  @IsOptional()
  @IsString()
  nguoiDuyet?: string;

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
