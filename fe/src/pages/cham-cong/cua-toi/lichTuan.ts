import { AttendanceRecord } from '@/services/attendanceRecordService';

/**
 * Lịch tuần trên màn hình chấm công của nhân viên.
 *
 * Mọi phép tính ngày ở đây dựng mốc bằng `Date.UTC` chứ không
 * `new Date("YYYY-MM-DD")` rồi đọc `getDay()`: cách sau đọc theo múi giờ
 * của máy người xem, nên người ngồi ở UTC-5 sẽ thấy lịch lùi một ngày.
 */

export type MauCham = 'xanh' | 'do' | 'xam';

const MOT_NGAY_MS = 86_400_000;

function mocUtc(ngay: string): Date {
  const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
  return new Date(Date.UTC(nam, thang - 1, ngayTrongThang));
}

function chuoiNgay(d: Date): string {
  const hai = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}-${hai(d.getUTCDate())}`;
}

/**
 * Thứ Hai của tuần chứa `ngay`.
 *
 * Tuần Việt Nam bắt đầu từ thứ Hai. `getUTCDay()` trả 0 cho Chủ Nhật, nên
 * Chủ Nhật phải lùi 6 ngày chứ không phải 0 — nếu không, Chủ Nhật sẽ tự mở
 * một tuần mới và lịch nhảy một ô mỗi cuối tuần.
 */
export function dauTuanCua(ngay: string): string {
  const d = mocUtc(ngay);
  const thu = d.getUTCDay();
  const lui = thu === 0 ? 6 : thu - 1;
  return chuoiNgay(new Date(d.getTime() - lui * MOT_NGAY_MS));
}

export function dichTuan(dauTuan: string, soTuan: number): string {
  return chuoiNgay(new Date(mocUtc(dauTuan).getTime() + soTuan * 7 * MOT_NGAY_MS));
}

export function bayNgayTu(dauTuan: string): string[] {
  const goc = mocUtc(dauTuan).getTime();
  return Array.from({ length: 7 }, (_, i) =>
    chuoiNgay(new Date(goc + i * MOT_NGAY_MS))
  );
}

export function gomTheoNgay(
  ds: AttendanceRecord[]
): Record<string, AttendanceRecord[]> {
  const kq: Record<string, AttendanceRecord[]> = {};
  for (const b of ds) {
    (kq[b.ngay] ??= []).push(b);
  }
  return kq;
}

/**
 * Màu chấm của một ngày, CHỈ đọc bản ghi.
 *
 * Cố ý không hỏi "ngày đó có phải ngày làm việc không": màn hình không biết
 * điều đó. /hom-nay chỉ trả ca của HÔM NAY; lịch nghỉ hằng tuần, ngày lễ và
 * đơn nghỉ phép nằm ở ba nguồn khác. Suy đoán bằng ca hiện tại sẽ bôi đỏ
 * Chủ Nhật và ngày lễ của cả công ty — sai to hơn nhiều so với để chúng xám.
 *
 * Hệ quả đã cân nhắc: ngày nghỉ, ngày lễ và ngày QUÊN CHẤM HOÀN TOÀN đều
 * xám như nhau. Xám nghĩa là "không có gì để nói". Muốn tách riêng ngày
 * quên chấm thì phải có lịch làm việc theo ngày — để đợt sau.
 */
export function mauChamNgay(banGhiCuaNgay?: AttendanceRecord[]): MauCham {
  if (!banGhiCuaNgay || banGhiCuaNgay.length === 0) return 'xam';
  const coVao = banGhiCuaNgay.some((b) => b.loai === 'vao');
  const coRa = banGhiCuaNgay.some((b) => b.loai === 'ra');
  return coVao && coRa ? 'xanh' : 'do';
}

/** "Tuần 20–26/07", hoặc "Tuần 27/07–02/08" khi tuần bắc qua hai tháng. */
export function nhanTuan(dauTuan: string): string {
  const [, thangDau, ngayDau] = dauTuan.split('-');
  const [, thangCuoi, ngayCuoi] = bayNgayTu(dauTuan)[6].split('-');

  return thangDau === thangCuoi
    ? `Tuần ${ngayDau}–${ngayCuoi}/${thangDau}`
    : `Tuần ${ngayDau}/${thangDau}–${ngayCuoi}/${thangCuoi}`;
}
