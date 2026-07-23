/**
 * Mọi quy đổi thời gian của chấm công đi qua đây.
 *
 * Repo lưu ngày dạng "YYYY-MM-DD" và giờ dạng "HH:mm" — nếu dùng
 * `toISOString().slice(0,10)` hay `Date.getHours()` thì kết quả phụ thuộc
 * TZ của tiến trình, và mọi ca sau 17:00 sẽ bị gán sai ngày khi chạy trên
 * máy chủ UTC.
 */
import { BadRequestException } from '@nestjs/common';

export const TZ_VN = 'Asia/Ho_Chi_Minh';

/** Ngày lịch theo giờ VN, dạng "YYYY-MM-DD". */
export function ngayVN(d: Date): string {
  // 'en-CA' là locale cho ra đúng thứ tự YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_VN,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Số phút tính từ 00:00 theo giờ VN. Nửa đêm = 0. */
export function phutTrongNgayVN(d: Date): number {
  // hourCycle 'h23' để nửa đêm ra 00 chứ không ra 24.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ_VN,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);

  const gio = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const phut = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return gio * 60 + phut;
}

/** Chỉ chấp nhận đúng dạng "YYYY-MM-DD". */
const RE_NGAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Dựng mốc UTC 00:00 của một chuỗi ngày, ném lỗi nếu ngày không có thật.
 *
 * Regex định dạng KHÔNG đủ: "2026-02-30" đúng dạng nhưng `Date.UTC` âm thầm
 * cuộn sang 02/03 — bản ghi sẽ có `ngay` và `thoiDiem` lệch nhau hai ngày mà
 * không có lỗi nào. Đối chiếu lại từng thành phần là cách duy nhất bắt được.
 */
function mocUtcCuaNgay(ngay: string): Date {
  if (typeof ngay !== 'string' || !RE_NGAY.test(ngay)) {
    throw new BadRequestException(
      `Ngày "${ngay}" không hợp lệ — cần đúng dạng YYYY-MM-DD`,
    );
  }
  const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
  const d = new Date(Date.UTC(nam, thang - 1, ngayTrongThang));
  if (
    d.getUTCFullYear() !== nam ||
    d.getUTCMonth() !== thang - 1 ||
    d.getUTCDate() !== ngayTrongThang
  ) {
    throw new BadRequestException(`Ngày "${ngay}" không tồn tại trên lịch`);
  }
  return d;
}

/**
 * Kiểm tra một chuỗi ngày là ngày CÓ THẬT, trả lại chính chuỗi đó.
 *
 * Dùng ở đầu các luồng nhận `ngay` từ client (DTO chỉ regex được định dạng,
 * không biết tháng 2 có bao nhiêu ngày).
 */
export function kiemTraNgay(ngay: string): string {
  mocUtcCuaNgay(ngay);
  return ngay;
}

/**
 * 0=CN, 1=T2 … 6=T7 cho một chuỗi ngày "YYYY-MM-DD".
 *
 * Dựng bằng `Date.UTC` chứ không `new Date("YYYY-MM-DD")` cộng getDay():
 * cách sau đọc theo TZ tiến trình nên máy chủ ở UTC-5 sẽ lùi một ngày.
 */
export function thuTrongTuanCuaNgay(ngay: string): number {
  return mocUtcCuaNgay(ngay).getUTCDay();
}

/**
 * Ngày lịch kế tiếp, dạng "YYYY-MM-DD".
 *
 * Cộng trên trục UTC nên không dính DST của TZ tiến trình; VN cũng không có
 * DST nên "ngày kế tiếp ở UTC" luôn là "ngày kế tiếp ở VN".
 */
export function ngayKeTiep(ngay: string): string {
  const d = mocUtcCuaNgay(ngay);
  d.setUTCDate(d.getUTCDate() + 1);
  // Ghép tay từ các thành phần UTC thay vì toISOString().slice(0,10): ở đây
  // `d` là mốc lịch thuần, không phải một thời điểm cần quy đổi múi giờ.
  const hai = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}-${hai(d.getUTCDate())}`;
}

/**
 * Số ngày lịch của khoảng [tuNgay, denNgay], tính CẢ hai đầu.
 *
 * Dùng `mocUtcCuaNgay` (đã kiểm ngày có thật) chứ không `new Date(chuỗi)`:
 * cách sau nhận cả "2026-02-30" rồi âm thầm cuộn sang tháng 3, và khoảng
 * tra cứu sẽ lệch hai ngày mà không có lỗi nào.
 */
export function soNgayGiua(tuNgay: string, denNgay: string): number {
  const a = mocUtcCuaNgay(tuNgay).getTime();
  const b = mocUtcCuaNgay(denNgay).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Chỉ chấp nhận đúng dạng "HH:mm" 24h: 00:00 … 23:59. */
const RE_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * "08:30" → 510.
 *
 * Ném lỗi thay vì trả NaN: `Math.max(0, NaN)` là NaN chứ không phải 0, nên
 * một ca có gioBatDau hỏng (dữ liệu cũ, import Excel) sẽ đẩy NaN thẳng vào
 * soPhutDiMuon rồi xuống MongoDB. Thà chặn ngay để HR sửa dữ liệu ca.
 */
export function hhmmSangPhut(hhmm: string): number {
  if (typeof hhmm !== 'string' || !RE_HHMM.test(hhmm)) {
    throw new BadRequestException(
      `Giờ "${hhmm}" không hợp lệ — cần đúng dạng HH:mm (00:00 đến 23:59)`,
    );
  }
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
