/**
 * Ba slot màu cho chuỗi dữ liệu của biểu đồ.
 *
 * Giá trị hex nằm trong `baoCao.css` (có nhánh `.dark`), ở đây chỉ giữ tên
 * biến CSS — SVG của recharts nhận `fill="var(--...)"` bình thường, nên đổi
 * light/dark không cần một dòng JS nào.
 *
 * Bộ màu đã chạy qua bộ kiểm tra của skill `dataviz` với `--pairs all` và PASS
 * cả 5 check ở cả hai chế độ. Teal thương hiệu `#1f7769` bị trượt sàn chroma
 * (đọc ra xám khi in hoặc với người mù màu) nên slot 1 dùng `#0a9480` — cùng
 * tông, chỉ nâng độ bão hoà. ĐỪNG đổi ba hex này mà không chạy lại validator.
 */

export const MAU_CHUOI = {
  slot1: 'var(--bc-series-1)',
  slot2: 'var(--bc-series-2)',
  slot3: 'var(--bc-series-3)',
} as const;

export const MAU_LUOI = 'var(--bc-grid)';
export const MAU_CHU_PHU = 'var(--bc-text-muted)';
