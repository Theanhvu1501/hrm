import type {
  DongLuong,
  KhoanLuong,
  KhoanPhieuLuong,
  PhieuLuong,
} from '@app/entities';

/**
 * Dựng phiếu lương giao cho người lao động từ một dòng bảng lương.
 *
 * Chỉ đọc `thucTe` — mức lương thật họ nhận. `khaiBao`/`mucKhaiBao`/
 * `luongThoaThuan` KHÔNG BAO GIỜ đi ra khỏi hàm này (spec P4.3 §2.1).
 *
 * Nhãn khoản ghép ở đây vì nhân viên KHÔNG có quyền `/luong/cau-hinh:xem` —
 * để FE tự tra thì hoặc màn phiếu lương 403, hoặc phải nới quyền cấu hình
 * lương cho mọi nhân viên. Cả hai đều tệ hơn ghép một mảng ở server.
 */
export function dungPhieuLuong(
  dong: DongLuong,
  khoanLuong: KhoanLuong[],
): PhieuLuong {
  const t: any = dong.thucTe ?? {};
  const theoMa = new Map((khoanLuong ?? []).map((k) => [k.ma, k]));

  const khoan: KhoanPhieuLuong[] = Object.entries(
    (t.giaTriTungKhoan ?? {}) as Record<string, number>,
  )
    .filter(([ma, soTien]) => {
      if (!soTien) return false; // phiếu lương không liệt kê thứ không có
      const k = theoMa.get(ma);
      // Khoản đã bị xoá khỏi danh mục vẫn giữ lại: xoá một khoản khỏi cấu hình
      // KHÔNG được làm biến mất một dòng tiền đã trả, nếu không nhân viên thấy
      // các khoản cộng lại không ra tổng thu nhập.
      return k ? k.vaoTongThuNhap : true;
    })
    .map(([ma, soTien]) => ({
      ma,
      ten: theoMa.get(ma)?.ten ?? ma,
      soTien,
    }));

  return {
    thang: dong.thang,
    hoTen: dong.employeeName ?? '',
    maNhanVien: dong.employeeCode ?? '',
    congThuong: dong.congThuong ?? 0,
    congThuViec: dong.congThuViec ?? 0,
    congKhac: dong.congKhac ?? 0,
    khoan,
    tongThuNhap: t.tongThuNhap ?? 0,
    bhxh: t.bhxh ?? 0,
    thue: t.thue ?? 0,
    // `?? 0`: dòng chốt trước P4.2c-2 không có trường này.
    phiCongDoan: t.phiCongDoan ?? 0,
    tamUng: dong.tamUng ?? 0,
    khauTruKhac: dong.khauTruKhac ?? 0,
    thucLinh: t.thucLinh ?? 0,
    thuNhapMienThue: t.thuNhapMienThue ?? 0,
    giamTru: t.giamTru ?? 0,
    thuNhapTinhThue: t.thuNhapTinhThue ?? 0,
  };
}
