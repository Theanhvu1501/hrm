import type { Employee, EmploymentHistory, Timesheet } from '@app/entities';

/**
 * Các chỉ số của BÁO CÁO NHÂN SỰ mà hệ thống ĐÃ CÓ NGUỒN để tính (yêu cầu
 * d47: "Liên kết dữ liệu sang khi đủ các phần hành").
 *
 * Chỉ số nào chưa có module nguồn (tuyển dụng, đào tạo, vi phạm) CỐ Ý không
 * có mặt ở đây — màn hình giữ nguyên trạng thái "Chưa có dữ liệu" cho chúng.
 * Bịa một con số cho đủ ô là thứ nguy hiểm nhất có thể đưa vào phòng họp.
 */
export interface ChiSoThang {
  ky: string; // 'YYYY-MM'
  /** Còn làm việc tại NGÀY CUỐI của kỳ. */
  tongNhanSu: number;
  vaoMoi: number;
  nghiViec: number;
  /** Trong số nghỉ việc, bao nhiêu người chưa làm đủ 6 tháng. */
  nghiSom: number;
  /** Lượt thăng tiến/bổ nhiệm ghi trong Quá trình công tác. */
  luotThangTien: number;
  /** % ngày vắng mặt trên tổng ngày công chuẩn của kỳ (từ bảng công). */
  tyLeVangMat: number | null;
  /** Tổng giờ làm thêm của kỳ (từ bảng công). */
  gioLamThem: number | null;
}

function ngayCuoiCuaThang(ky: string): string {
  const [nam, thang] = ky.split('-').map(Number);
  const d = new Date(Date.UTC(nam, thang, 0));
  return d.toISOString().slice(0, 10);
}

function ngayDauCuaThang(ky: string): string {
  return `${ky}-01`;
}

/** Số tháng giữa hai mốc 'YYYY-MM-DD' — dùng để đếm "nghỉ sớm". */
function soThangGiua(tu: string, den: string): number {
  const a = new Date(tu);
  const b = new Date(den);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth())
  );
}

export function dungChiSoThang(
  ky: string,
  nhanVien: Employee[],
  quaTrinh: EmploymentHistory[],
  bangCong: Timesheet[],
): ChiSoThang {
  const dau = ngayDauCuaThang(ky);
  const cuoi = ngayCuoiCuaThang(ky);

  const conLam = nhanVien.filter((nv) => {
    if (nv.isActive === false) return false;
    if (nv.ngayVaoLam && nv.ngayVaoLam > cuoi) return false;
    if (nv.ngayNghiViec && nv.ngayNghiViec < cuoi) return false;
    return true;
  });

  const vaoMoi = nhanVien.filter(
    (nv) => nv.ngayVaoLam && nv.ngayVaoLam >= dau && nv.ngayVaoLam <= cuoi,
  );
  const nghiViec = nhanVien.filter(
    (nv) => nv.ngayNghiViec && nv.ngayNghiViec >= dau && nv.ngayNghiViec <= cuoi,
  );

  const nghiSom = nghiViec.filter(
    (nv) =>
      nv.ngayVaoLam &&
      nv.ngayNghiViec &&
      soThangGiua(nv.ngayVaoLam, nv.ngayNghiViec) < 6,
  ).length;

  const luotThangTien = quaTrinh.filter(
    (q) =>
      q.isActive !== false &&
      q.loaiThayDoi === 'bo_nhiem' &&
      (q.ngayHieuLuc ?? '') >= dau &&
      (q.ngayHieuLuc ?? '') <= cuoi,
  ).length;

  const bangCongKy = bangCong.filter(
    (b) => b.thang === ky && b.isActive !== false,
  );

  // Chưa tổng hợp bảng công tháng này thì trả `null`, KHÔNG trả 0: 0% vắng
  // mặt đọc như "cả công ty đi làm đủ", còn `null` để màn hình nói "chưa có
  // bảng công".
  let tyLeVangMat: number | null = null;
  let gioLamThem: number | null = null;
  if (bangCongKy.length > 0) {
    const tongCong = bangCongKy.reduce((t, b) => t + (b.soNgayCong ?? 0), 0);
    const tongNghi = bangCongKy.reduce(
      (t, b) =>
        t + (b.soNgayNghiKhongLuong ?? 0) + (b.soNgayOm ?? 0),
      0,
    );
    const mau = tongCong + tongNghi;
    tyLeVangMat = mau > 0 ? Math.round((tongNghi / mau) * 1000) / 10 : 0;
    gioLamThem = bangCongKy.reduce((t, b) => t + (b.soGioLamThem ?? 0), 0);
  }

  return {
    ky,
    tongNhanSu: conLam.length,
    vaoMoi: vaoMoi.length,
    nghiViec: nghiViec.length,
    nghiSom,
    luotThangTien,
    tyLeVangMat,
    gioLamThem,
  };
}
