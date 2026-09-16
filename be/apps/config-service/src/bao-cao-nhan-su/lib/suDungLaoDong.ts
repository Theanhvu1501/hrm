import type { Employee } from '@app/entities';

/**
 * BÁO CÁO TÌNH HÌNH SỬ DỤNG LAO ĐỘNG (yêu cầu d48).
 *
 * Nộp định kỳ 6 tháng cho cơ quan quản lý lao động (NĐ 145/2020, mẫu 01/PLI):
 * số lao động tại thời điểm báo cáo, chia theo giới tính và loại hợp đồng,
 * kèm số tăng/giảm trong kỳ.
 *
 * Hàm THUẦN để test được từng lát cắt: đây là số liệu nộp cho cơ quan nhà
 * nước, sai một ô là phải giải trình.
 */

export interface ChiTietSuDungLaoDong {
  /** Tổng số người còn làm việc tại NGÀY CHỐT của kỳ. */
  tongLaoDong: number;
  nu: number;
  nam: number;
  /** Chia theo `Employee.loaiHopDong`. */
  theoLoaiHopDong: Record<string, number>;
  /** Chia theo phòng ban (id — FE tra tên qua danh mục). */
  theoPhongBan: Record<string, number>;
  /** Vào làm trong kỳ. */
  tangTrongKy: number;
  /** Nghỉ việc trong kỳ. */
  giamTrongKy: number;
  /** Người dưới 18 tuổi tại ngày chốt — mẫu 01/PLI hỏi riêng. */
  duoiViThanhNien: number;
  /** Người từ đủ 60 (nam) / 55 (nữ) trở lên — mẫu hỏi "lao động cao tuổi". */
  caoTuoi: number;
}

function tuoiTai(ngaySinh: string | undefined, moc: string): number | null {
  if (!ngaySinh) return null;
  const sinh = new Date(ngaySinh);
  const den = new Date(moc);
  if (Number.isNaN(sinh.getTime()) || Number.isNaN(den.getTime())) return null;
  let tuoi = den.getUTCFullYear() - sinh.getUTCFullYear();
  const chuaQuaSinhNhat =
    den.getUTCMonth() < sinh.getUTCMonth() ||
    (den.getUTCMonth() === sinh.getUTCMonth() &&
      den.getUTCDate() < sinh.getUTCDate());
  if (chuaQuaSinhNhat) tuoi -= 1;
  return tuoi;
}

/**
 * Người này còn làm việc tại `moc` không.
 *
 * Đọc MỐC NGHỈ (`ngayNghiViec`) chứ không đọc `trangThai`: báo cáo 6 tháng có
 * thể lập sau khi người ta đã nghỉ, mà tại thời điểm báo cáo họ vẫn đang làm.
 * Đọc trạng thái hiện tại là đếm thiếu người, và con số đó đem nộp.
 */
function conLamViecTai(nv: Employee, moc: string): boolean {
  if (nv.ngayVaoLam && nv.ngayVaoLam > moc) return false;
  if (nv.ngayNghiViec && nv.ngayNghiViec < moc) return false;
  return true;
}

export function dungBaoCaoSuDungLaoDong(
  nhanVien: Employee[],
  tuNgay: string,
  denNgay: string,
): ChiTietSuDungLaoDong {
  const conLam = nhanVien.filter(
    (nv) => nv.isActive !== false && conLamViecTai(nv, denNgay),
  );

  const theoLoaiHopDong: Record<string, number> = {};
  const theoPhongBan: Record<string, number> = {};
  let nu = 0;
  let nam = 0;
  let duoiViThanhNien = 0;
  let caoTuoi = 0;

  for (const nv of conLam) {
    if (nv.gioiTinh === 'nu') nu += 1;
    else if (nv.gioiTinh === 'nam') nam += 1;

    const loai = nv.loaiHopDong || 'khong_ro';
    theoLoaiHopDong[loai] = (theoLoaiHopDong[loai] ?? 0) + 1;

    const pb = nv.departmentId || 'khong_ro';
    theoPhongBan[pb] = (theoPhongBan[pb] ?? 0) + 1;

    const tuoi = tuoiTai(nv.ngaySinh, denNgay);
    if (tuoi !== null) {
      if (tuoi < 18) duoiViThanhNien += 1;
      // Mốc theo giới: nam 60, nữ 55 — mẫu 01/PLI đếm "lao động cao tuổi"
      // theo tuổi nghỉ hưu, không theo một con số chung.
      if ((nv.gioiTinh === 'nu' && tuoi >= 55) || (nv.gioiTinh !== 'nu' && tuoi >= 60)) {
        caoTuoi += 1;
      }
    }
  }

  const trongKy = (ngay?: string) =>
    !!ngay && ngay >= tuNgay && ngay <= denNgay;

  return {
    tongLaoDong: conLam.length,
    nu,
    nam,
    theoLoaiHopDong,
    theoPhongBan,
    tangTrongKy: nhanVien.filter((nv) => trongKy(nv.ngayVaoLam)).length,
    giamTrongKy: nhanVien.filter((nv) => trongKy(nv.ngayNghiViec)).length,
    duoiViThanhNien,
    caoTuoi,
  };
}
