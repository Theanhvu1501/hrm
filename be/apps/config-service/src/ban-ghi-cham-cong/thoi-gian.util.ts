/**
 * Mọi quy đổi thời gian của chấm công đi qua đây.
 *
 * Repo lưu ngày dạng "YYYY-MM-DD" và giờ dạng "HH:mm" — nếu dùng
 * `toISOString().slice(0,10)` hay `Date.getHours()` thì kết quả phụ thuộc
 * TZ của tiến trình, và mọi ca sau 17:00 sẽ bị gán sai ngày khi chạy trên
 * máy chủ UTC.
 */
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

/** 0=CN, 1=T2 … 6=T7 — khớp Date.getDay(), tính theo ngày ở VN. */
export function thuTrongTuanVN(d: Date): number {
  const [nam, thang, ngay] = ngayVN(d).split('-').map(Number);
  return new Date(Date.UTC(nam, thang - 1, ngay)).getUTCDay();
}

/** "08:30" → 510. */
export function hhmmSangPhut(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
