/**
 * Shared permission modules and generator — used by master-data-service (tenant provisioning)
 * and auth-service (lazy provisioning for Portal-created companies).
 *
 * Phải khớp với FE catalog `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts`
 * (Danh sách route nền tảng HRM phase 1) — nếu lệch, mỗi lần lưu trên trang Phân quyền sẽ
 * xoá mất các quyền không có ở FE khỏi role, hoặc thiếu quyền provisioning cho FE.
 */
export const PERMISSION_MODULES = [
  '/cau-hinh/vai-tro',
  '/cau-hinh/phan-quyen',
  '/cau-hinh/thanh-vien',
  '/nhan-su/ho-so-nhan-vien',
  '/nhan-su/hop-dong-lao-dong',
  '/nhan-su/qua-trinh-cong-tac',
  '/nhan-su/thoi-viec',
  '/cham-cong/ca-lam-viec',
  '/cham-cong/dia-diem',
  '/cham-cong/don-tu',
  '/cham-cong/bang-cong',
];

const PERMISSION_ACTIONS = ['xem', 'them', 'sua', 'xoa', 'xuat'];

export function generateAllPermissions(): string[] {
  const permissions: string[] = [];
  for (const mod of PERMISSION_MODULES) {
    for (const action of PERMISSION_ACTIONS) {
      permissions.push(`${mod}:${action}`);
    }
  }
  return permissions;
}
