import React from 'react';
import {
  HomeOutlined, TeamOutlined, ScheduleOutlined, WalletOutlined, BarChartOutlined,
  IdcardOutlined, FileTextOutlined, PrinterOutlined, SwapOutlined, UserDeleteOutlined,
  ApartmentOutlined,
  CheckCircleOutlined, ClockCircleOutlined, EnvironmentOutlined, FileDoneOutlined,
  TableOutlined, CalendarOutlined, FieldTimeOutlined, TabletOutlined, AuditOutlined,
  SettingOutlined, DollarOutlined, CalculatorOutlined, ProfileOutlined,
} from '@ant-design/icons';

/**
 * Menu nhan-su theo hệ sidebar dùng chung với ke-toan-so (rail + panel + flyout).
 * Cùng component, cùng kiểu dữ liệu — chỉ khác danh sách phân hệ.
 *
 * Cấu hình (Vai trò / Phân quyền / Thành viên / Cấu hình lương) KHÔNG lên rail:
 * giống ke-toan-so, chúng nằm trong nút bánh răng ở header.
 *
 * Quyền của từng mục GIỮ NGUYÊN như sidebar cũ — xem `permKey` / `luonHien`.
 */
export type ModuleId = 'tong-quan' | 'nhan-su' | 'cham-cong' | 'luong' | 'bao-cao';

export interface MenuModule {
  id: ModuleId;
  /** Tiêu đề panel. */
  label: string;
  /** Nhãn dưới icon rail — viết tắt cho vừa 62px. */
  railLabel: string;
  icon: React.ReactNode;
  /** Nhóm 1 mục → bấm rail vào thẳng, không mở panel. */
  route?: string;
}

export interface MenuLeaf {
  /** Đích điều hướng. */
  key: string;
  label: string;
  module: ModuleId;
  /** Caption cụm trong panel, viết HOA. */
  cluster?: string;
  /** 'soon' = chưa có màn hình, route trỏ ComingSoon. */
  status: 'ok' | 'soon';
  icon?: React.ReactNode;
  /** Khóa quyền khi khác key (mục đi chung quyền với trang khác). */
  permKey?: string;
  /** Hiện với MỌI người, không xét quyền. */
  luonHien?: true;
  /** Giữ route, KHÔNG hiện trên sidebar. */
  legacy?: true;
}

export const MENU_MODULES: MenuModule[] = [
  { id: 'tong-quan', label: 'Tổng quan', railLabel: 'Tổng quan', icon: <HomeOutlined />, route: '/' },
  { id: 'nhan-su',   label: 'Nhân sự',   railLabel: 'Nhân sự',   icon: <TeamOutlined /> },
  // 'Chấm công' rộng 47px ở cỡ 8.5px — vượt 46px của ô rail, bị cắt thành "Chấm cô…".
  { id: 'cham-cong', label: 'Chấm công', railLabel: 'Công',      icon: <ScheduleOutlined /> },
  { id: 'luong',     label: 'Lương',     railLabel: 'Lương',     icon: <WalletOutlined /> },
  { id: 'bao-cao',   label: 'Báo cáo',   railLabel: 'Báo cáo',   icon: <BarChartOutlined />, route: '/bao-cao/nhan-su' },
];

export const MENU_LEAVES: MenuLeaf[] = [
  // ===== 1. Tổng quan (1) =====
  { key: '/', label: 'Tổng quan', module: 'tong-quan', status: 'ok', luonHien: true, icon: <HomeOutlined /> },

  // ===== 2. Nhân sự (5) =====
  { key: '/nhan-su/ho-so-nhan-vien', label: 'Hồ sơ nhân viên', module: 'nhan-su', cluster: 'HỒ SƠ & HỢP ĐỒNG', status: 'ok', icon: <IdcardOutlined /> },
  // Sơ đồ tổ chức đã có trong Quản trị chung → ẩn khỏi sidebar (Điều chỉnh 20/9 #1)
  { key: '/nhan-su/so-do-to-chuc', label: 'Sơ đồ tổ chức', module: 'nhan-su', cluster: 'HỒ SƠ & HỢP ĐỒNG', status: 'ok', icon: <ApartmentOutlined />, legacy: true },
  { key: '/nhan-su/hop-dong-lao-dong', label: 'Hợp đồng lao động', module: 'nhan-su', cluster: 'HỒ SƠ & HỢP ĐỒNG', status: 'ok', icon: <FileTextOutlined /> },
  // Mẫu in đi chung quyền với Hợp đồng lao động (App.tsx cũng khoá bằng quyền đó).
  { key: '/nhan-su/mau-in-hop-dong', permKey: '/nhan-su/hop-dong-lao-dong', label: 'Mẫu in hợp đồng', module: 'nhan-su', cluster: 'HỒ SƠ & HỢP ĐỒNG', status: 'ok', icon: <PrinterOutlined /> },
  { key: '/nhan-su/qua-trinh-cong-tac', label: 'Quá trình công tác', module: 'nhan-su', cluster: 'BIẾN ĐỘNG', status: 'ok', icon: <SwapOutlined /> },
  { key: '/nhan-su/thoi-viec', label: 'Thôi việc', module: 'nhan-su', cluster: 'BIẾN ĐỘNG', status: 'ok', icon: <UserDeleteOutlined /> },

  // ===== 3. Chấm công (11) =====
  // "Chấm công của tôi" hiện VÔ ĐIỀU KIỆN: mục duy nhất mọi nhân viên dùng mỗi
  // ngày. Thêm điều kiện quyền vào đây là khoá đường chấm công cả công ty.
  { key: '/cham-cong/cua-toi', label: 'Chấm công của tôi', module: 'cham-cong', status: 'ok', luonHien: true, icon: <CheckCircleOutlined /> },
  { key: '/cham-cong/don-tu', label: 'Đơn chấm công', module: 'cham-cong', cluster: 'THEO DÕI', status: 'ok', icon: <FileDoneOutlined /> },
  { key: '/cham-cong/bang-cong', label: 'Bảng công', module: 'cham-cong', cluster: 'THEO DÕI', status: 'ok', icon: <TableOutlined /> },
  { key: '/cham-cong/ban-ghi', label: 'Bản ghi chấm công', module: 'cham-cong', cluster: 'THEO DÕI', status: 'ok', icon: <AuditOutlined /> },
  { key: '/cham-cong/quy-phep', label: 'Quỹ phép', module: 'cham-cong', cluster: 'THEO DÕI', status: 'ok', icon: <WalletOutlined /> },
  { key: '/cham-cong/quy-gio', label: 'Quỹ giờ làm thêm', module: 'cham-cong', cluster: 'THEO DÕI', status: 'ok', icon: <FieldTimeOutlined /> },
  { key: '/cham-cong/ca-lam-viec', label: 'Cấu hình chấm công & ca', module: 'cham-cong', cluster: 'THIẾT LẬP', status: 'ok', icon: <ClockCircleOutlined /> },
  { key: '/cham-cong/dia-diem', label: 'Địa điểm chấm công', module: 'cham-cong', cluster: 'THIẾT LẬP', status: 'ok', icon: <EnvironmentOutlined /> },
  { key: '/cham-cong/ngay-le', label: 'Ngày nghỉ lễ', module: 'cham-cong', cluster: 'THIẾT LẬP', status: 'ok', icon: <CalendarOutlined /> },
  { key: '/cham-cong/thiet-bi', label: 'Thiết bị chấm công', module: 'cham-cong', cluster: 'THIẾT LẬP', status: 'ok', icon: <TabletOutlined /> },
  // Yêu cầu d24: "Cấu hình chấm công" đã gộp thành TAB của màn Cấu hình chấm
  // công & ca — không còn là một mục menu riêng. Route `/cham-cong/cau-hinh`
  // vẫn sống (mở thẳng tab đó) để link cũ và quyền cũ không vỡ.

  // ===== 4. Lương (5) — cả nhóm đi chung quyền Bảng lương, trừ Tạm ứng =====
  { key: '/luong/bang-luong', label: 'Bảng lương', module: 'luong', status: 'ok', icon: <DollarOutlined /> },
  { key: '/luong/tam-ung', label: 'Tạm ứng lương', module: 'luong', status: 'ok', icon: <WalletOutlined /> },
  { key: '/luong/bang-luong-them-gio', permKey: '/luong/bang-luong', label: 'Bảng lương thêm giờ', module: 'luong', status: 'ok', icon: <CalculatorOutlined /> },
  { key: '/luong/quyet-toan-tncn', permKey: '/luong/bang-luong', label: 'Quyết toán TNCN', module: 'luong', status: 'ok', icon: <ProfileOutlined /> },
  { key: '/luong/bao-cao', permKey: '/luong/bang-luong', label: 'BHXH · Công đoàn · Thuế', module: 'luong', status: 'ok', icon: <ProfileOutlined /> },

  // Cấu hình lương mở từ nút bánh răng (route /cau-hinh/...) nhưng thuộc nghiệp
  // vụ Lương — khai legacy để rail sáng Lương và panel hiện danh sách Lương.
  { key: '/cau-hinh/cau-hinh-luong', label: 'Cấu hình lương', module: 'luong', status: 'ok', legacy: true },

  // ===== 5. Báo cáo (1) — tổng hợp từ hồ sơ nên đi chung quyền Hồ sơ nhân viên =====
  { key: '/bao-cao/nhan-su', permKey: '/nhan-su/ho-so-nhan-vien', label: 'Báo cáo nhân sự', module: 'bao-cao', status: 'ok', icon: <BarChartOutlined /> },
];

/** Đường dẫn để navigate (gồm cả query nếu có). */
export const routeOf = (leaf: MenuLeaf): string => leaf.key;

/** Pathname không query — dùng để so với location.pathname. */
export const pathOf = (leaf: MenuLeaf): string => leaf.key.split('?')[0];

/** Khóa quyền. permKey khi mục đi chung quyền; còn lại là chính key. */
export const permKeyOf = (leaf: MenuLeaf): string => leaf.permKey ?? pathOf(leaf);

/** Mục hiện trên sidebar của một phân hệ, giữ nguyên thứ tự khai báo. */
export const leavesOfModule = (id: ModuleId): MenuLeaf[] =>
  MENU_LEAVES.filter((l) => l.module === id && !l.legacy);

export const leafByKey = (key: string): MenuLeaf | undefined =>
  MENU_LEAVES.find((l) => l.key === key);

/** Nhãn hiển thị của một pathname — ComingSoon dùng để đặt tiêu đề. */
export const labelByPath = (path: string): string | undefined =>
  MENU_LEAVES.find((l) => pathOf(l) === path)?.label;

/** Route của các mục chưa có màn hình — App.tsx sinh route ComingSoon từ đây. */
export const soonRoutes = (): string[] =>
  MENU_LEAVES.filter((l) => l.status === 'soon').map(pathOf);
