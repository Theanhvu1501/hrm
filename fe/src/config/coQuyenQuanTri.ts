import { routePermissions } from './routePermissions';

/**
 * Người này có quyền quản trị nào trong app không?
 *
 * `routePermissions` đã là danh sách đầy đủ mọi quyền quản trị của app, và
 * cố ý KHÔNG chứa đường chấm công tự phục vụ (xem chú thích ở cuối file
 * đó). Đọc thẳng từ nó nghĩa là thêm một màn quản trị mới sẽ tự động được
 * tính — không có danh sách thứ hai phải nhớ cập nhật bằng tay.
 *
 * Nhận `hasPermission` qua tham số thay vì gọi `useAuth()` bên trong: hàm
 * thuần thì test được bằng bảng, và dùng lại được ở cả chỗ không phải
 * component.
 */
export function coQuyenQuanTri(
  hasPermission: (quyen: string) => boolean
): boolean {
  return Object.values(routePermissions).some((quyen) => hasPermission(quyen));
}
