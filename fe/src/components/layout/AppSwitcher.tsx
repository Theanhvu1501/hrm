import { Button } from "antd";
import { urlManChonUngDung } from "@/services/identitySession";
import { IconLuoiApp } from "@/components/icons/IconLuoiApp";

/**
 * Lưới 9 chấm trên header — đưa người dùng VỀ màn chọn ứng dụng của Master CEO
 * (portal identity), không dựng lại danh sách app tại chỗ.
 *
 * Trước 17/09/2026 chỗ này mở modal `ManChonUngDung` tự vẽ danh sách app từ
 * `GET /me/apps`. Hai nơi cùng vẽ một danh sách thì mỗi lần portal thêm app là
 * một lần app con hiện thiếu. Portal `/` vào thẳng màn chọn app nên chỉ cần
 * một đường link. Đây cũng đúng cách `ke-toan-so` đang làm — hai app anh em
 * phải cùng một lối ra, nếu không người dùng học hai hành vi khác nhau cho
 * cùng một cái nút.
 *
 * Dev chưa cấu hình `VITE_IDENTITY_URL` (đăng nhập cục bộ): không có portal để
 * về, ẩn luôn nút thay vì để một lối cụt.
 */
export function AppSwitcher() {
  const url = urlManChonUngDung();
  if (!url) return null;

  return (
    <Button
      type="text"
      href={url}
      aria-label="Chọn ứng dụng"
      title="Chọn ứng dụng"
      className="!flex items-center !text-foreground"
    >
      <IconLuoiApp size={18} />
    </Button>
  );
}

export default AppSwitcher;
