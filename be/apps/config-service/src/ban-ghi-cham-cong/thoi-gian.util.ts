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
 * 0=CN, 1=T2 … 6=T7 cho một chuỗi ngày "YYYY-MM-DD".
 *
 * Dựng bằng `Date.UTC` chứ không `new Date("YYYY-MM-DD")` cộng getDay():
 * cách sau đọc theo TZ tiến trình nên máy chủ ở UTC-5 sẽ lùi một ngày.
 */
export function thuTrongTuanCuaNgay(ngay: string): number {
  if (typeof ngay !== 'string' || !RE_NGAY.test(ngay)) {
    throw new BadRequestException(
      `Ngày "${ngay}" không hợp lệ — cần đúng dạng YYYY-MM-DD`,
    );
  }
  const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
  return new Date(Date.UTC(nam, thang - 1, ngayTrongThang)).getUTCDay();
}

/** 0=CN, 1=T2 … 6=T7 — khớp Date.getDay(), tính theo ngày ở VN. */
export function thuTrongTuanVN(d: Date): number {
  return thuTrongTuanCuaNgay(ngayVN(d));
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
