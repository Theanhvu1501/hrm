/**
 * Định dạng thời gian theo giờ Việt Nam cho các màn hình chấm công.
 *
 * Đối xứng với be/apps/config-service/src/ban-ghi-cham-cong/thoi-gian.util.ts.
 * Backend luôn trả thoiDiem dạng ISO (UTC); nếu FE dùng toLocaleTimeString()
 * không truyền timeZone thì kết quả phụ thuộc máy người xem — người ngồi
 * múi giờ khác sẽ thấy sai giờ chấm công.
 */
export const TZ_VN = 'Asia/Ho_Chi_Minh';

/** Định dạng ngày dùng cho DatePicker và cho API. */
export const DINH_DANG_NGAY = 'YYYY-MM-DD';
/** Định dạng giờ dùng cho TimePicker và cho API. */
export const DINH_DANG_GIO = 'HH:mm';

/** ISO → "08:05" theo giờ VN. Chuỗi rỗng nếu không có giá trị. */
export function gioVN(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('vi-VN', {
    timeZone: TZ_VN,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * ISO → "08:05:23" theo giờ VN — có GIÂY.
 *
 * Tách khỏi `gioVN()` chứ không thêm giây vào đó: `gioVN` còn được dùng cho ô
 * nhập giờ của màn HR nhập bù, mà DTO backend chỉ nhận `gio` dạng "HH:mm"
 * (regex `^([01]\d|2[0-3]):([0-5]\d)$`) — thêm giây vào là hỏng cả đường nhập bù.
 *
 * Dùng cho các màn CHỈ HIỂN THỊ của nhân viên, nơi giây có ích: hai lượt bấm
 * cách nhau vài giây mà cùng hiện "08:05" thì không phân biệt được.
 */
export function gioGiayVN(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('vi-VN', {
    timeZone: TZ_VN,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** ISO → ngày kèm giờ theo giờ VN. Chuỗi rỗng nếu không có giá trị. */
export function ngayGioVN(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { timeZone: TZ_VN });
}

/** Hôm nay theo giờ VN, dạng "YYYY-MM-DD". */
export function homNayVN(): string {
  // 'en-CA' là locale cho ra đúng thứ tự YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_VN,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
