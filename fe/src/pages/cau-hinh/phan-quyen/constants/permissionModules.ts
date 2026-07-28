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
      { key: '/cham-cong/ca-lam-viec', label: 'Cấu hình ca làm việc' },
      { key: '/cham-cong/dia-diem', label: 'Địa điểm chấm công' },
      { key: '/cham-cong/don-tu', label: 'Đơn chấm công' },
      { key: '/cham-cong/quy-phep', label: 'Quỹ phép năm' },
      { key: '/cham-cong/bang-cong', label: 'Bảng công' },
      { key: '/cham-cong/ngay-le', label: 'Ngày nghỉ lễ' },
      { key: '/cham-cong/thiet-bi', label: 'Thiết bị chấm công' },
      { key: '/cham-cong/ban-ghi', label: 'Bản ghi chấm công' },
      // CỐ Ý KHÔNG khai '/cham-cong/cua-toi' ở đây: đó là màn hình tự phục vụ
      // (mọi nhân viên đăng nhập xem thiết bị/bản ghi CỦA CHÍNH MÌNH), không
      // gắn quyền theo vai trò — BE route GET .../cua-toi chỉ có JwtGuard
      // (không AdminGuard), xem thiet-bi-cham-cong.controller.ts. Đừng "bổ
      // sung cho đủ bộ" ở đây, route đó không nhận quyền.
    ],
  },
  {
    key: 'luong',
    label: 'LƯƠNG',
    isSection: true,
    children: [
      { key: '/luong/bang-luong', label: 'Bảng lương' },
      { key: '/luong/cau-hinh', label: 'Cấu hình lương' },
    ],
  },
];
