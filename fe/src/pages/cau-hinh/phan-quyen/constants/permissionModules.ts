export interface PermissionModule {
  key: string;
  label: string;
  isSection?: boolean;
  children?: PermissionModule[];
}

export type PermissionAction = 'xem' | 'them' | 'sua' | 'xoa' | 'xuat';

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'xem', label: 'Xem' },
  { key: 'them', label: 'Thêm' },
  { key: 'sua', label: 'Sửa' },
  { key: 'xoa', label: 'Xoá' },
  { key: 'xuat', label: 'Xuất' },
];

export const permissionModules: PermissionModule[] = [
  {
    key: 'cau-hinh',
    label: 'CẤU HÌNH',
    isSection: true,
    children: [
      // Danh sách route nền tảng HRM (phase 1). Menu nghiệp vụ HRM (chấm công,
      // lương, tuyển dụng, ...) sẽ được bổ sung ở Phase 2+.
      // Phải khớp với BE PERMISSION_MODULES — nếu thiếu ở đây, mỗi lần lưu trên
      // trang Phân quyền sẽ xoá mất các quyền này khỏi role.
      { key: '/cau-hinh/vai-tro', label: 'Quản lý Vai trò' },
      { key: '/cau-hinh/phan-quyen', label: 'Phân quyền' },
      { key: '/cau-hinh/thanh-vien', label: 'Quản lý Thành viên' },
      { key: '/cau-hinh/tenant', label: 'Quản lý Công ty' },
    ],
  },
  {
    key: 'nhan-su',
    label: 'NHÂN SỰ',
    isSection: true,
    children: [
      { key: '/nhan-su/ho-so-nhan-vien', label: 'Hồ sơ nhân viên' },
      { key: '/nhan-su/hop-dong-lao-dong', label: 'Hợp đồng lao động' },
      { key: '/nhan-su/qua-trinh-cong-tac', label: 'Quá trình công tác' },
      { key: '/nhan-su/thoi-viec', label: 'Thôi việc / Bàn giao' },
    ],
  },
  {
    key: 'cham-cong',
    label: 'CHẤM CÔNG',
    isSection: true,
    children: [
      // '/cham-cong/don-tu' đã có trong BE PERMISSION_MODULES nhưng chưa có
      // màn hình FE tương ứng (Phase 2+) — chưa thêm vào catalog để tránh
      // hiển thị quyền cho màn hình không tồn tại.
      { key: '/cham-cong/ca-lam-viec', label: 'Cấu hình ca làm việc' },
      { key: '/cham-cong/dia-diem', label: 'Địa điểm chấm công' },
    ],
  },
];
