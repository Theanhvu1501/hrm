import {
  AttendanceRecord,
  TrangThaiHomNay,
} from '@/services/attendanceRecordService';

/**
 * Ngày được chọn sẵn khi mở một tuần.
 *
 * Tuần chứa hôm nay thì chọn hôm nay — đó là thứ người ta mở app để xem.
 * Tuần khác thì chọn ngày đầu tuần, để không trỏ vào một ngày của tuần cũ.
 */
export function ngayMacDinhCuaTuan(dauTuan: string, homNay: string): string {
  const bayNgay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${dauTuan}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  return bayNgay.includes(homNay) ? homNay : dauTuan;
}

/**
 * Xuất công khai để `pages/toi/bang-cong/thangCong.ts` (lịch tháng của vỏ
 * nhân viên) tái dùng ĐÚNG cùng một luật thay vì chép lại — hai nơi tính
 * khác luật là nguồn lỗi âm thầm khó phát hiện qua review.
 */
export function suySoCong(banGhi: AttendanceRecord[]): number | null {
  const coVao = banGhi.some((b) => b.loai === 'vao');
  const coRa = banGhi.some((b) => b.loai === 'ra');
  if (coVao && coRa) return 1;
  if (coVao) return null;
  return 0;
}

/**
 * Dữ liệu để vẽ 3 ô và khối chi tiết cho MỘT ngày.
 *
 * Hôm nay CỐ Ý lấy từ `homNay` chứ không từ `banGhiTuan`: dải tuần chỉ nạp
 * lại khi đổi tuần, nên ngay sau cú chấm công nó đã cũ — người vừa bấm sẽ
 * không thấy lượt của chính mình.
 *
 * `soCong` của hôm nay dùng số backend tính; ngày khác suy tại chỗ theo cùng
 * luật, vì backend chỉ tính cho ngày công đang mở.
 */
export function duLieuNgay(
  ngay: string,
  homNay: string,
  homNayData: TrangThaiHomNay | null,
  banGhiTuan: AttendanceRecord[]
): { banGhi: AttendanceRecord[]; soCong: number | null; laHomNay: boolean } {
  if (ngay === homNay) {
    // CỐ Ý không dùng `homNayData?.soCong ?? 0`: `??` coi `null` là nullish
    // và sẽ biến `soCong: null` hợp lệ (đã vào, đang chờ ra) thành `0` (chưa
    // có gì để tính) — hai nghĩa khác hẳn nhau (xem oCong() trong
    // oTrangThai.ts). Chỉ được thay bằng 0 khi CHÍNH `homNayData` là
    // null/undefined (chưa tải được dữ liệu hôm nay).
    return {
      banGhi: homNayData ? homNayData.banGhi : [],
      soCong: homNayData ? homNayData.soCong : 0,
      laHomNay: true,
    };
  }
  const banGhi = banGhiTuan.filter((b) => b.ngay === ngay);
  return { banGhi, soCong: suySoCong(banGhi), laHomNay: false };
}
