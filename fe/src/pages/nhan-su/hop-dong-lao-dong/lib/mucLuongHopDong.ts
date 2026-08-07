/**
 * Mức lương ĐIỀN SẴN vào hợp đồng khi chọn nhân viên.
 *
 * Hợp đồng lao động ghi **mức khai báo** (số đăng ký với cơ quan BHXH), không
 * phải lương thoả thuận (số thực nhận). Trước bản này ô "Mức lương" trên form
 * hợp đồng là trường tự do không nối với hồ sơ, nên quy tắc đó chỉ tồn tại
 * trong đầu người nhập — đo trên production 08/2026, 2/4 hợp đồng đang in
 * đúng lương thoả thuận và 2 cái còn lại không khớp con số nào trong hồ sơ.
 *
 * Đây chỉ là giá trị GỢI Ý: HR sửa đè được, và hợp đồng vẫn lưu số của riêng
 * nó. Cố ý KHÔNG đọc thẳng hồ sơ lúc in — in lại một hợp đồng đã ký năm
 * ngoái phải ra đúng con số đã ký, không phải lương hiện tại. Cùng lý do
 * `chucDanh` được snapshot lúc ký.
 *
 * Quy tắc "0 = chưa khai" khớp `mucKhaiBaoApDung` bên BE: không có mức đóng
 * BHXH nào bằng 0, và hợp đồng in "Mức lương: 0 đồng" thì không ký được.
 */
export function mucLuongInTrenHopDong(
  nhanVien: { mucKhaiBao?: number } | undefined,
  mucKhaiBaoMacDinh: number | undefined,
): number | undefined {
  if (!nhanVien) return undefined;

  const khai = nhanVien.mucKhaiBao;
  if (typeof khai === "number" && khai > 0) return khai;

  return typeof mucKhaiBaoMacDinh === "number" && mucKhaiBaoMacDinh > 0
    ? mucKhaiBaoMacDinh
    : undefined;
}
