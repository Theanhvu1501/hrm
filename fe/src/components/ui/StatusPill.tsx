import React from 'react';

export type PillTone = 'ok' | 'cho' | 'tu-choi' | 'nhap' | 'dang' | 'trung-tinh';

/**
 * `nhap` và `trung-tinh` CỐ Ý dùng chung một tông — không phải sót.
 *
 * "Nháp" trong hệ thống nghĩa là chứng từ chưa mang trạng thái nghiệp vụ nào,
 * tức đúng là trạng thái trung tính; bịa thêm một sắc xám thứ hai chỉ tạo ra
 * một khác biệt mà nghiệp vụ không có, và người đọc bảng sẽ đi tìm ý nghĩa của
 * nó. Viết thành MỘT hằng số dùng chung để hai tông không thể lệch nhau về sau
 * (trước đây là hai chuỗi class chép tay giống hệt); ai cần tách thì đổi ở đây.
 */
const XAM_TRUNG_TINH = 'bg-[hsl(var(--muted))] text-[hsl(var(--ink-2))]';

/**
 * NỀN dùng màu gốc pha loãng, CHỮ dùng bản "mực" (--*-ink) tối hơn.
 *
 * Chữ pill chỉ 10.5px — theo WCAG đây là chữ thường, ngưỡng tương phản 4.5:1
 * chứ không phải 3:1 của chữ lớn. Dùng chính màu gốc làm màu chữ thì bốn tông
 * ok / cho / tu-choi / dang chỉ đạt 3.4–4.0:1. Hạ alpha KHÔNG cứu được (alpha
 * chỉ làm chữ nhạt thêm), nên phải dùng biến thể tối hơn khai ở `index.css`
 * (--green-ink / --amber-ink / --red-ink / --blue-ink, có cả bản `.dark`).
 * Sau khi đổi: ok 4.91 · cho 4.93 · tu-choi 4.87 · dang 4.91 (nền card trắng);
 * trên nền trang #F5F5F7 vẫn ≥ 4.50. Tông xám nhap/trung-tinh vốn đã 4.63.
 */
const TONE: Record<PillTone, string> = {
  ok: 'bg-[hsl(var(--green)/0.12)] text-[hsl(var(--green-ink))]',
  cho: 'bg-[hsl(var(--amber)/0.12)] text-[hsl(var(--amber-ink))]',
  'tu-choi': 'bg-[hsl(var(--red)/0.12)] text-[hsl(var(--red-ink))]',
  nhap: XAM_TRUNG_TINH,
  dang: 'bg-[hsl(var(--blue-soft))] text-[hsl(var(--blue-ink))]',
  'trung-tinh': XAM_TRUNG_TINH,
};

/** Nhãn trạng thái dạng viên thuốc — một kiểu duy nhất cho cả dự án.
 *  Không bao giờ xuống dòng: pill vỡ thành hai dòng khi đặt cạnh nút trong ô hẹp. */
export const StatusPill: React.FC<{
  tone: PillTone;
  children: React.ReactNode;
}> = ({ tone, children }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-full px-[8px] py-[2px] text-[10.5px] font-medium leading-none ${
      TONE[tone] ?? TONE['trung-tinh']
    }`}
  >
    {children}
  </span>
);

export default StatusPill;
