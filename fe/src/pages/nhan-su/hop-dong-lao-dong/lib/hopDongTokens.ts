/**
 * Danh sách token {{...}} hợp lệ cho mẫu in hợp đồng lao động — hiển thị cho
 * người soạn mẫu tham khảo. PHẢI khớp `HOP_DONG_TOKENS` ở
 * `be/apps/config-service/src/hop-dong/lib/hopDongRender.ts` — từ khi BE
 * chặn lưu mẫu dùng token lạ (review Important #7: lỗi gõ như
 * `{{mucLuongg}}` giờ bị từ chối lúc lưu thay vì âm thầm in trống), người
 * soạn mẫu CẦN biết chính xác token nào tồn tại, không thể đoán.
 */
export interface HopDongTokenDoc {
  token: string;
  moTa: string;
}

export const HOP_DONG_TOKEN_DOCS: HopDongTokenDoc[] = [
  { token: "{{soHopDong}}", moTa: "Số hợp đồng" },
  { token: "{{ngayLapNgay}}", moTa: "Ngày lập (dd)" },
  { token: "{{ngayLapThang}}", moTa: "Ngày lập (mm)" },
  { token: "{{ngayLapNam}}", moTa: "Ngày lập (yyyy)" },
  { token: "{{tenCongTy}}", moTa: "Tên công ty" },
  { token: "{{diaChiCongTy}}", moTa: "Địa chỉ công ty" },
  { token: "{{maSoThueCongTy}}", moTa: "Mã số thuế công ty" },
  { token: "{{nguoiDaiDien}}", moTa: "Người đại diện công ty" },
  { token: "{{chucVuNguoiDaiDien}}", moTa: "Chức vụ người đại diện" },
  { token: "{{thanhPhoKy}}", moTa: "Thành phố ký hợp đồng" },
  { token: "{{maHopDongMau}}", moTa: "Hậu tố số hợp đồng (vd /HĐLĐ-MC.1)" },
  { token: "{{hoTenNLD}}", moTa: "Họ tên người lao động" },
  { token: "{{ngaySinh}}", moTa: "Ngày sinh (dd/mm/yyyy)" },
  { token: "{{gioiTinh}}", moTa: "Giới tính (Nam/Nữ/Khác)" },
  { token: "{{soCCCD}}", moTa: "Số CCCD" },
  { token: "{{diaChiNLD}}", moTa: "Địa chỉ thường trú người lao động" },
  { token: "{{soDienThoaiNLD}}", moTa: "Điện thoại người lao động" },
  { token: "{{chucDanh}}", moTa: "Chức danh (snapshot lúc ký)" },
  { token: "{{dieu1_1}}", moTa: "Loại hợp đồng (Điều 1.1)" },
  { token: "{{dieu1_2}}", moTa: "Thời hạn hợp đồng (Điều 1.2)" },
  { token: "{{mucLuong}}", moTa: "Mức lương (đã định dạng)" },
  { token: "{{phuCapText}}", moTa: "Phụ cấp (số thật hoặc câu mặc định)" },
];
