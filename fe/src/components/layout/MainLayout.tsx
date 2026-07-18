import React, { useState, useEffect, useRef } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Tooltip,
  Tag,
  message,
  Drawer,
} from "antd";
import {
  DashboardOutlined,
  BookOutlined,
  FileTextOutlined,
  WalletOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  DownloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
  ProjectOutlined,
  AppstoreOutlined,
  DollarOutlined,
  AuditOutlined,
  QuestionCircleOutlined,
  MenuOutlined,
  CloseOutlined,
  SafetyCertificateOutlined,
  TagOutlined,
  SwapOutlined,
  LineChartOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  StockOutlined,
  CalculatorOutlined,
  CarOutlined,
  ToolOutlined,
  ContainerOutlined,
  SolutionOutlined,
  InsuranceOutlined,
  FormOutlined,
  FileProtectOutlined,
  DatabaseOutlined,
  ScheduleOutlined,
  RiseOutlined,
  InboxOutlined,
  ReconciliationOutlined,
  ProfileOutlined,
  FileDoneOutlined,
  TableOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  PartitionOutlined,
  CreditCardOutlined,
  FileSearchOutlined,
  AccountBookOutlined,
  PieChartOutlined,
  SnippetsOutlined,
  NodeIndexOutlined,
  FileAddOutlined,
  StopOutlined,
  CopyOutlined,
  CoffeeOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import type { MenuProps } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { useTerm } from "@/contexts/TermContext";
import { TenantSwitcher } from "./TenantSwitcher";
import { AppSwitcher } from "./AppSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { isCommonKey, unionMenuKeys } from "@/config/modules";
import { MENU_CATALOG } from "@/config/menuCatalog";
import type { LinhVuc } from "@/services/linhVucService";

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

// Mobile/tablet (gồm iPad iPadOS 13+ báo là Macintosh) → hiện mục "Cài đặt ứng dụng" trong menu user.
const IS_MOBILE_OR_TABLET =
  /android|iphone|ipod|ipad/i.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

// Item hiển thị nếu key thuộc COMMON hoặc nằm trong tập menuKeys được truyền vào.
function keyMatches(key: string, moduleKeys: string[]): boolean {
  if (isCommonKey(key)) return true;
  return moduleKeys.some((k) => key === k || key.startsWith(k + "/"));
}

// Lọc menu theo lĩnh vực đang chọn: giữ COMMON + mục thuộc menuKeys của lĩnh vực.
// Mục cha giữ lại nếu còn ít nhất 1 con sau khi lọc.
function filterByModule(items: MenuItem[], moduleKeys: string[]): MenuItem[] {
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const mi = item as { key?: string; children?: MenuItem[] };
      if (mi.children && mi.children.length > 0) {
        const fc = filterByModule(mi.children, moduleKeys);
        if (fc.length === 0) return null;
        return { ...mi, children: fc } as MenuItem;
      }
      return keyMatches(mi.key as string, moduleKeys) ? item : null;
    })
    .filter(Boolean) as MenuItem[];
}

// Danh sách các routes đã có component
const existingRoutes = new Set([
  "/",
  "/profile",
  "/danh-muc/tai-khoan",
  "/danh-muc/doi-tuong",
  "/danh-muc/du-an",
  "/danh-muc/san-pham",
  "/danh-muc/bo-phan",
  "/danh-muc/khoan-muc",
  "/danh-muc/so-du-dau-ky",
  "/danh-muc/ngan-hang",
  "/danh-muc/dong-tien",
  "/danh-muc/chu-dau-tu",
  "/danh-muc/nhom-khuyen-mai",
  "/danh-muc/nhom-quan-ly",
  "/danh-muc/loai-chung-tu",
  "/danh-muc/nhom-khoan-muc",
  "/danh-muc/loai-giao-dich",
  "/danh-muc/hop-dong",
  "/danh-muc/quy-chuan",
  "/danh-muc/ho-so-chung-tu",
  "/danh-muc/kho",
  "/danh-muc/don-vi-tinh",
  "/danh-muc/ly-do-khong-hop-le",
  "/danh-muc/nhom-vat-tu",
  "/danh-muc/hang-hoa-vat-tu",
  "/kho/nhap-kho",
  "/kho/xuat-kho",
  "/kho/chuyen-kho",
  "/bep-an/dinh-muc-tien-an",
  "/bep-an/cong-thuc-dinh-luong",
  "/bep-an/diem-danh-an",
  "/bep-an/de-xuat-mua",
  "/bep-an/kiem-soat-chi-phi",
  "/trung-tam-du-lieu/hop-dong",
  "/trung-tam-du-lieu/thu-tien-hop-dong",
  "/trung-tam-du-lieu/hd-ban-ra",
  "/chung-tu/phieu-thu",
  "/chung-tu/phieu-chi",
  "/chung-tu/nhat-ky-chung",
  "/so-quy",
  "/cong-no/phai-thu",
  "/cong-no/phai-tra",
  "/bao-cao/tai-chinh",
  "/bao-cao/pnl",
  "/bao-cao/so-cai",
  "/bao-cao/so-chi-tiet-tai-khoan",
  "/bao-cao/bang-can-doi",
  "/bao-cao/bang-tong-hop",
  "/bao-cao/hop-dong",

  "/thue/bang-ke-mua-vao",
  "/thue/bang-ke-ban-ra",
  "/thue/tong-hop",
  "/thue/bao-cao-tndn",

  "/bieu-mau",
  "/chinh-sach",
  "/huong-dan",

  "/cau-hinh/phan-quyen",
  "/cau-hinh/vai-tro",
]);

// Helper để tạo label với badge "Sắp ra mắt"
const createLabel = (text: string, path: string) => {
  const isComingSoon = !existingRoutes.has(path);
  if (isComingSoon) {
    return (
      <span className="menu-coming-soon" title={`${text} - Sắp ra mắt`}>
        <span className="menu-text">{text}</span>
        <span className="coming-soon-dot" />
      </span>
    );
  }
  return text;
};

function getItem(
  label: React.ReactNode,
  key: string,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: "group"
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

// Helper để tạo menu item với check coming soon
function getMenuItem(
  text: string,
  path: string,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  const isComingSoon = !existingRoutes.has(path) && !children;
  return {
    key: path,
    icon,
    children,
    label: createLabel(text, path),
    className: isComingSoon ? "menu-item-coming-soon" : undefined,
  } as MenuItem;
}

// Map menuKey → termKey cho các menu đổi tên theo ngành.
const MENU_TERM_KEYS: Record<string, string> = {
  "/danh-muc/chu-dau-tu": "chuDauTu",
};

// Trả mảng MỚI, thay label các item có termKey bằng nhãn động (đệ quy children).
function relabelMenu(
  items: MenuItem[],
  t: (key: string, surface?: string) => string
): MenuItem[] {
  return items.map((item) => {
    const mi = item as { key?: string; children?: MenuItem[] };
    const key = mi.key as string;
    let next: MenuItem = item;
    if (mi.children && mi.children.length > 0) {
      next = { ...(next as any), children: relabelMenu(mi.children, t) };
    }
    const termKey = MENU_TERM_KEYS[key];
    if (termKey) {
      next = { ...(next as any), label: createLabel(t(termKey), key) };
    }
    return next;
  });
}

// ===== ĐIỀU HÀNH =====
const dieuHanhMenuItems: MenuItem[] = [
  getMenuItem("Tổng quan", "/", <DashboardOutlined />),

  getItem("Phân tích", "/phan-tich", <LineChartOutlined />, [
    getMenuItem("Kế toán", "/phan-tich/bao-cao-tai-chinh", <PieChartOutlined />),
    getMenuItem("Bán hàng", "/phan-tich/ban-hang", <ShoppingCartOutlined />),
    getMenuItem("Mua hàng", "/phan-tich/mua-hang", <ShoppingOutlined />),
    getMenuItem("Công nợ", "/phan-tich/cong-no", <ReconciliationOutlined />),
    getMenuItem("Dòng tiền", "/phan-tich/dong-tien", <DollarOutlined />),
    getMenuItem("Tồn kho", "/phan-tich/ton-kho", <InboxOutlined />),
    getMenuItem("Khả năng thanh khoản", "/phan-tich/thanh-khoan", <StockOutlined />),
  ]),
];

// ===== KẾ TOÁN =====
const keToAnMenuItems: MenuItem[] = [
  getItem("Báo cáo", "/bao-cao", <BarChartOutlined />, [
    getMenuItem("Báo cáo tài chính", "/bao-cao/tai-chinh", <PieChartOutlined />),
    getMenuItem("Sổ chi tiết tài khoản", "/bao-cao/so-chi-tiet-tai-khoan", <AccountBookOutlined />),
    getMenuItem("Sổ chi tiết công nợ", "/bao-cao/so-chi-tiet-cong-no", <FileSearchOutlined />),
    getMenuItem("Sổ chi tiết phát sinh", "/bao-cao/so-chi-tiet-phat-sinh", <ProfileOutlined />),
    getMenuItem("Bảng tổng hợp", "/bao-cao/bang-tong-hop", <TableOutlined />),
    getMenuItem("Báo cáo hợp đồng", "/bao-cao/hop-dong", <FileProtectOutlined />),
  ]),

  getItem("Thuế", "/thue", <CalculatorOutlined />, [
    getMenuItem("Bảng kê mua vào", "/thue/bang-ke-mua-vao", <FileAddOutlined />),
    getMenuItem("Bảng kê bán ra", "/thue/bang-ke-ban-ra", <FileDoneOutlined />),
    getMenuItem("Tổng hợp thuế", "/thue/tong-hop", <TableOutlined />),
    getMenuItem("Báo cáo nhanh thuế TNDN", "/thue/bao-cao-tndn", <BarChartOutlined />),
  ]),

  getItem("Trung tâm dữ liệu", "/trung-tam-du-lieu", <DatabaseOutlined />, [
    getMenuItem("Kế hoạch", "/trung-tam-du-lieu/ke-hoach", <ScheduleOutlined />),
    getMenuItem("Dự báo", "/trung-tam-du-lieu/du-bao", <RiseOutlined />),
    getMenuItem("Dữ liệu tổng hợp", "/chung-tu/nhat-ky-chung", <AuditOutlined />),
    getMenuItem("Quản lý Tài sản", "/trung-tam-du-lieu/tai-san", <CarOutlined />),
    getMenuItem("Quản lý Hàng hóa", "/trung-tam-du-lieu/hang-hoa", <AppstoreOutlined />),
    getMenuItem("Quản lý Nguyên liệu", "/trung-tam-du-lieu/nguyen-lieu", <ContainerOutlined />),
    getMenuItem("Quản lý Dụng cụ", "/trung-tam-du-lieu/dung-cu", <ToolOutlined />),
    getMenuItem("Quản lý Hợp đồng", "/trung-tam-du-lieu/hop-dong", <FileProtectOutlined />),
    getMenuItem("Thu tiền hợp đồng", "/trung-tam-du-lieu/thu-tien-hop-dong", <DollarOutlined />),
    getMenuItem("Hóa đơn bán ra", "/trung-tam-du-lieu/hd-ban-ra", <FileDoneOutlined />),
    getMenuItem("Quản lý nhân sự", "/trung-tam-du-lieu/nhan-su", <SolutionOutlined />),
    getMenuItem("Lương & BHXH", "/trung-tam-du-lieu/luong-bhxh", <InsuranceOutlined />),
  ]),

  getItem("Chứng từ", "/chung-tu", <FileTextOutlined />, [
    getMenuItem("Phiếu thu", "/chung-tu/phieu-thu", <CreditCardOutlined />),
    getMenuItem("Phiếu chi", "/chung-tu/phieu-chi", <WalletOutlined />),
    getMenuItem("Phiếu nhập", "/chung-tu/phieu-nhap", <FileAddOutlined />),
    getMenuItem("Phiếu xuất", "/chung-tu/phieu-xuat", <FileDoneOutlined />),
    getMenuItem("Phiếu lương", "/chung-tu/phieu-luong", <SnippetsOutlined />),
    getMenuItem("Bảng tính lương", "/chung-tu/bang-tinh-luong", <CalculatorOutlined />),
    getMenuItem("Bảng chấm công", "/chung-tu/bang-cham-cong", <ClockCircleOutlined />),
    getMenuItem("Bảng chấm công làm thêm giờ", "/chung-tu/cham-cong-lam-them", <FieldTimeOutlined />),
    getMenuItem("Bảng phân bổ khấu hao TSCĐ", "/chung-tu/phan-bo-khau-hao", <PartitionOutlined />),
    getMenuItem("Phiếu kế toán", "/chung-tu/phieu-ke-toan", <AuditOutlined />),
    getMenuItem("Đề nghị thanh toán", "/chung-tu/de-nghi-thanh-toan", <FormOutlined />),
  ]),

  getItem("Kho", "/kho", <InboxOutlined />, [
    getMenuItem("Nhập kho", "/kho/nhap-kho", <FileAddOutlined />),
    getMenuItem("Xuất kho", "/kho/xuat-kho", <FileDoneOutlined />),
    getMenuItem("Chuyển kho", "/kho/chuyen-kho", <SwapOutlined />),
  ]),

  getItem("Bếp ăn", "/bep-an", <CoffeeOutlined />, [
    getMenuItem("Định mức tiền ăn", "/bep-an/dinh-muc-tien-an", <ProfileOutlined />),
    getMenuItem("Công thức định lượng", "/bep-an/cong-thuc-dinh-luong", <ExperimentOutlined />),
    getMenuItem("Điểm danh ăn", "/bep-an/diem-danh-an", <TeamOutlined />),
    getMenuItem("Đề xuất mua thực phẩm", "/bep-an/de-xuat-mua", <ShoppingCartOutlined />),
    getMenuItem("Bảng kiểm soát chi phí", "/bep-an/kiem-soat-chi-phi", <BarChartOutlined />),
  ]),
];

// ===== THƯ VIỆN - Library menu =====
const thuVienMenuItems: MenuItem[] = [
  // Danh mục
  getItem("Danh mục", "/danh-muc", <BookOutlined />, [
    getMenuItem("Tài khoản", "/danh-muc/tai-khoan", <BankOutlined />),
    getMenuItem("Đối tượng", "/danh-muc/doi-tuong", <TeamOutlined />),
    getMenuItem("Dự án", "/danh-muc/du-an", <ProjectOutlined />),
    getMenuItem("Sản phẩm", "/danh-muc/san-pham", <AppstoreOutlined />),
    getMenuItem("Hợp đồng", "/danh-muc/hop-dong", <FileProtectOutlined />),
    getMenuItem("Bộ phận", "/danh-muc/bo-phan", <TeamOutlined />),
    getMenuItem("Khoản mục", "/danh-muc/khoan-muc", <DollarOutlined />),
    getMenuItem("Số dư đầu kỳ", "/danh-muc/so-du-dau-ky", <DollarOutlined />),
    getMenuItem("Kho", "/danh-muc/kho", <InboxOutlined />),
    getMenuItem("Hàng hóa vật tư", "/danh-muc/hang-hoa-vat-tu", <InboxOutlined />),
    getMenuItem("Đơn vị tính", "/danh-muc/don-vi-tinh", <TagOutlined />),
    getMenuItem("Lý do không hợp lệ", "/danh-muc/ly-do-khong-hop-le", <StopOutlined />),
    getMenuItem("Nhóm vật tư", "/danh-muc/nhom-vat-tu", <AppstoreOutlined />),
    getItem("Khác", "/danh-muc/khac", <AppstoreOutlined />, [
      getMenuItem("Chủ đầu tư", "/danh-muc/chu-dau-tu", <UserOutlined />),
      getMenuItem("Nhóm khoản mục", "/danh-muc/nhom-khoan-muc", <TagOutlined />),
      getMenuItem("Ngân hàng & Quỹ", "/danh-muc/ngan-hang", <BankOutlined />),
      getMenuItem("Dòng tiền", "/danh-muc/dong-tien", <DollarOutlined />),
      getMenuItem("Nhóm khuyến mại", "/danh-muc/nhom-khuyen-mai", <AppstoreOutlined />),
      getMenuItem("Nhóm quản lý", "/danh-muc/nhom-quan-ly", <TeamOutlined />),
      getMenuItem("Loại chứng từ", "/danh-muc/loai-chung-tu", <FileTextOutlined />),
      getMenuItem("Loại giao dịch", "/danh-muc/loai-giao-dich", <SwapOutlined />),
      getMenuItem("Quy chuẩn hạch toán", "/danh-muc/quy-chuan", <AuditOutlined />),
      getMenuItem("Hồ sơ chứng từ", "/danh-muc/ho-so-chung-tu", <FileTextOutlined />),
    ]),
  ]),

  // getMenuItem("Sổ quỹ", "/so-quy", <WalletOutlined />),

  // getItem("Công nợ", "/cong-no", <ReconciliationOutlined />, [
  //   getMenuItem("Phải thu", "/cong-no/phai-thu", <RiseOutlined />),
  //   getMenuItem("Phải trả", "/cong-no/phai-tra", <DollarOutlined />),
  // ]),

  // Quy trình
  getMenuItem("Quy trình", "/quy-trinh", <NodeIndexOutlined />),

  // Chính sách
  getMenuItem("Chính sách", "/chinh-sach", <SafetyCertificateOutlined />),

  // Biểu mẫu
  getMenuItem("Biểu mẫu", "/bieu-mau", <FormOutlined />),

  // Hướng dẫn
  getMenuItem("Hướng dẫn", "/huong-dan", <QuestionCircleOutlined />),
];

// Helper function to check if current route is a form screen (create/edit)
const isFormScreen = (pathname: string): boolean => {
  return pathname.includes('/tao-moi') || pathname.includes('/sua');
};

const MainLayout: React.FC = () => {
  // Initialize collapsed based on current URL - if on form screen, start collapsed
  const [collapsed, setCollapsed] = useState(() => isFormScreen(window.location.pathname));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    logout,
    currentTenant,
    hasPermission,
    availableModules,
    allModules,
    getModule,
  } = useAuth();
  const { t } = useTerm();
  const currentRole = currentTenant?.role;
  const isSuperAdmin = user?.isSuperAdmin || false;
  const isMobile = useIsMobile();

  const roleInfo = currentRole ? { label: currentRole, color: 'blue' } : null;

  const canAccessRoute = (path: string): boolean => {
    if (isSuperAdmin) return true;
    if (path === '/') return hasPermission('/:xem') || hasPermission('/tong-quan:xem');
    return hasPermission(`${path}:xem`);
  };

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const menuItem = item as {
          key?: string;
          children?: MenuItem[];
          label?: React.ReactNode;
          icon?: React.ReactNode;
        };
        const key = menuItem.key as string;

        if (menuItem.children && menuItem.children.length > 0) {
          const filteredChildren = filterMenuItems(menuItem.children);
          if (filteredChildren.length === 0) {
            return null;
          }
          return {
            ...menuItem,
            children: filteredChildren,
          } as MenuItem;
        }

        if (!canAccessRoute(key)) {
          return null;
        }

        return item;
      })
      .filter(Boolean) as MenuItem[];
  };

  // Phân hệ khả dụng (đã sắp theo order) — hiển thị GỘP, không cần chọn.
  const availableModuleDefs: LinhVuc[] = availableModules
    .map((code) => getModule(code))
    .filter((m): m is LinhVuc => !!m)
    .sort((a, b) => a.order - b.order);

  // Menu chưa gán cho phân hệ nào → coi như thuộc KE_TOAN.
  const isAssigned = (key: string): boolean =>
    allModules.some((m) =>
      m.menuKeys.some((k) => key === k || key.startsWith(k + "/")),
    );
  const unassignedKeys = availableModules.includes("KE_TOAN")
    ? MENU_CATALOG.map((e) => e.key).filter(
        (key) => !isCommonKey(key) && !isAssigned(key),
      )
    : [];

  // Union menuKeys mọi phân hệ + phần chưa gán → dùng cho ĐIỀU HÀNH & THƯ VIỆN.
  const allEffectiveKeys = [
    ...unionMenuKeys(availableModuleDefs),
    ...unassignedKeys,
  ];

  // Lọc theo vai trò (SuperAdmin bỏ qua).
  const byRole = (items: MenuItem[]): MenuItem[] =>
    isSuperAdmin ? items : filterMenuItems(items);

  const filteredDieuHanhMenu = relabelMenu(
    byRole(filterByModule(dieuHanhMenuItems, allEffectiveKeys)),
    t
  );
  const filteredThuVienMenu = relabelMenu(
    byRole(filterByModule(thuVienMenuItems, allEffectiveKeys)),
    t
  );

  // Khu nghiệp vụ: 1 section / phân hệ, tiêu đề = tên phân hệ.
  const moduleSections = availableModuleDefs
    .map((def) => {
      const keys =
        def.code === "KE_TOAN"
          ? [...def.menuKeys, ...unassignedKeys]
          : def.menuKeys;
      const items = relabelMenu(byRole(filterByModule(keToAnMenuItems, keys)), t);
      return { code: def.code, title: def.name.toUpperCase(), items };
    })
    .filter((s) => s.items.length > 0);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Track previous pathname to detect navigation
  const prevPathnameRef = useRef(location.pathname);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Auto collapse sidebar when navigating to form screens (create/edit)
  useEffect(() => {
    // Skip on initial render (when prev === current)
    if (prevPathnameRef.current !== location.pathname) {
      if (!isMobile && !collapsed && isFormScreen(location.pathname)) {
        setCollapsed(true);
      }
      prevPathnameRef.current = location.pathname;
    }
  }, [location.pathname, isMobile, collapsed]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    logout();
    message.success("Đã đăng xuất thành công");
    navigate("/login");
  };

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "user-info",
      label: (
        <div className="py-2 px-1">
          <div className="font-medium">{user?.hoTen}</div>
          <div className="text-xs text-muted-foreground">{user?.email}</div>
          <Tag color={roleInfo?.color} className="mt-1">
            {roleInfo?.label}
          </Tag>
        </div>
      ),
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Thông tin cá nhân",
      onClick: () => navigate("/profile"),
    },
    ...(IS_MOBILE_OR_TABLET
      ? ([
          { type: "divider" as const },
          {
            key: "install-pwa",
            icon: <DownloadOutlined />,
            label: "Cài đặt ứng dụng",
            onClick: () => window.dispatchEvent(new Event("open-install-pwa")),
          },
        ] as MenuProps["items"])
      : []),
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      danger: true,
      onClick: handleLogout,
    },
  ];

  const canManageConfig = hasPermission('/cau-hinh/vai-tro:xem') || hasPermission('/cau-hinh/phan-quyen:xem') || hasPermission('/cau-hinh/thanh-vien:xem') || user?.isSuperAdmin;

  // Settings menu items for gear icon dropdown
  const settingsMenuItems: MenuProps["items"] = [
    ...(canManageConfig ? [
      ...(hasPermission('/cau-hinh/vai-tro:xem') || user?.isSuperAdmin ? [{
        key: "vai-tro",
        icon: <TeamOutlined />,
        label: "Quản lý Vai trò",
        onClick: () => navigate("/cau-hinh/vai-tro"),
      }] : []),
      ...(hasPermission('/cau-hinh/phan-quyen:xem') || user?.isSuperAdmin ? [{
        key: "phan-quyen",
        icon: <SafetyCertificateOutlined />,
        label: "Phân quyền",
        onClick: () => navigate("/cau-hinh/phan-quyen"),
      }] : []),
      ...(hasPermission('/cau-hinh/thanh-vien:xem') || user?.isSuperAdmin ? [{
        key: "thanh-vien",
        icon: <UserOutlined />,
        label: "Quản lý Thành viên",
        onClick: () => navigate("/cau-hinh/thanh-vien"),
      }] : []),
    ] : []),
    ...(user?.isSuperAdmin ? [{
      key: "tenant",
      icon: <TeamOutlined />,
      label: "Quản lý Công ty",
      onClick: () => navigate("/cau-hinh/tenant"),
    }] : []),
    ...(user?.isSuperAdmin ? [{
      key: "linh-vuc",
      icon: <AppstoreOutlined />,
      label: "Quản lý Lĩnh vực",
      onClick: () => navigate("/cau-hinh/linh-vuc"),
    }] : []),
    ...(user?.isSuperAdmin ? [{
      key: "sao-chep-danh-muc",
      icon: <CopyOutlined />,
      label: "Sao chép danh mục",
      onClick: () => navigate("/cau-hinh/sao-chep-danh-muc"),
    }] : []),
  ];

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === "/") return ["/"];
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 0) {
      return ["/" + parts[0]];
    }
    return [];
  };

  const siderWidth = collapsed ? 56 : 240;

  // Mobile Drawer Menu
  const MobileDrawer = () => (
    <Drawer
      title={
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Master CEO"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="font-semibold">Master CEO</span>
        </div>
      }
      placement="left"
      onClose={() => setMobileMenuOpen(false)}
      open={mobileMenuOpen}
      width={300}
      closeIcon={<CloseOutlined />}
      styles={{
        body: { padding: 0, background: "hsl(var(--sidebar-background))", overflowY: "auto" },
        header: {
          background: "hsl(var(--sidebar-background))",
          borderBottom: "1px solid hsl(var(--sidebar-border))",
          color: "hsl(var(--sidebar-foreground))",
        },
      }}
    >
      {/* ĐIỀU HÀNH Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">ĐIỀU HÀNH</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={filteredDieuHanhMenu}
          onClick={handleMenuClick}
          className="!bg-transparent border-r-0 sidebar-menu"
        />
      </div>

      {/* Nghiệp vụ — 1 section / phân hệ */}
      {moduleSections.map((sec) => (
        <div className="sidebar-section" key={sec.code}>
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">{sec.title}</span>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={getSelectedKeys()}
            defaultOpenKeys={getOpenKeys()}
            items={sec.items}
            onClick={handleMenuClick}
            className="!bg-transparent border-r-0 sidebar-menu"
          />
        </div>
      ))}

      {/* THƯ VIỆN Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">THƯ VIỆN</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={filteredThuVienMenu}
          onClick={handleMenuClick}
          className="!bg-transparent border-r-0 sidebar-menu"
        />
      </div>
    </Drawer>
  );

  return (
    <Layout className="min-h-screen">
      {/* Mobile Drawer */}
      {isMobile && <MobileDrawer />}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          collapsedWidth={56}
          className={`!bg-sidebar ${collapsed ? "sidebar-collapsed" : ""}`}
          style={{
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Logo & Collapse Button */}
          <div className="h-12 flex items-center justify-between px-3 border-b border-sidebar-border flex-shrink-0">
            {collapsed ? (
              <Button
                type="text"
                size="small"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="!text-sidebar-foreground/70 hover:!text-sidebar-foreground hover:!bg-sidebar-accent mx-auto"
              />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <img
                    src="/logo.jpg"
                    alt="Master CEO"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <span className="text-sidebar-foreground font-semibold text-sm">
                    Master CEO
                  </span>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                  className="!text-sidebar-foreground/70 hover:!text-sidebar-foreground hover:!bg-sidebar-accent"
                />
              </>
            )}
          </div>

          {/* Scrollable Menu Container */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll">
            {/* ĐIỀU HÀNH Section */}
            <div className="sidebar-section">
              {!collapsed && (
                <div className="sidebar-section-header">
                  <span className="sidebar-section-title">ĐIỀU HÀNH</span>
                </div>
              )}
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={getSelectedKeys()}
                defaultOpenKeys={collapsed ? [] : getOpenKeys()}
                items={filteredDieuHanhMenu}
                onClick={handleMenuClick}
                className="!bg-transparent border-r-0 sidebar-menu"
              />
            </div>

            {/* Nghiệp vụ — 1 section / phân hệ */}
            {moduleSections.map((sec) => (
              <div className="sidebar-section" key={sec.code}>
                {!collapsed && (
                  <div className="sidebar-section-header">
                    <span className="sidebar-section-title">{sec.title}</span>
                  </div>
                )}
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={getSelectedKeys()}
                  defaultOpenKeys={collapsed ? [] : getOpenKeys()}
                  items={sec.items}
                  onClick={handleMenuClick}
                  className="!bg-transparent border-r-0 sidebar-menu"
                />
              </div>
            ))}

            {/* THƯ VIỆN Section */}
            <div className="sidebar-section">
              {!collapsed && (
                <div className="sidebar-section-header">
                  <span className="sidebar-section-title">THƯ VIỆN</span>
                </div>
              )}
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={getSelectedKeys()}
                defaultOpenKeys={collapsed ? [] : getOpenKeys()}
                items={filteredThuVienMenu}
                onClick={handleMenuClick}
                className="!bg-transparent border-r-0 sidebar-menu"
              />
            </div>
          </div>
        </Sider>
      )}

      {/* Main Content Area */}
      <Layout
        style={{
          marginLeft: isMobile ? 0 : siderWidth,
          transition: "margin-left 0.2s ease",
          minHeight: "100vh",
        }}
      >
        {/* Header - Compact */}
        <Header
          className="!px-3 sm:!px-4 flex items-center justify-between sticky top-0 z-50"
          style={{
            background: "hsl(var(--card))",
            borderBottom: "1px solid hsl(var(--border))",
            height: 48,
            minHeight: 48,
          }}
        >
          {/* Left: Mobile menu button or empty space */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                className="!text-foreground"
              />
            )}
            {/* Mobile Logo */}
            {isMobile && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">
                    KT
                  </span>
                </div>
              </div>
            )}
            {/* App Switcher — chuyển sang Giao việc / app khác (giữ nguyên công ty) */}
            <AppSwitcher />
          </div>

          {/* Center: Search Bar - Hide on small mobile */}
          {/* <div className="hidden sm:flex flex-1 max-w-md mx-4 lg:mx-8">
            <Input
              placeholder="Tìm kiếm (Ctrl+K)..."
              prefix={<SearchOutlined className="text-muted-foreground" />}
              suffix={
                <span className="hidden md:inline text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  ⌘K
                </span>
              }
              className="!bg-muted/50 w-full"
            />
          </div> */}

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Tenant Switcher */}
            <TenantSwitcher />

            {/* Settings dropdown with gear icon */}
            {user && settingsMenuItems && settingsMenuItems.length > 0 && (
              <Dropdown
                menu={{ items: settingsMenuItems }}
                placement="bottomRight"
                trigger={["click"]}
              >
                <Tooltip title="Cấu hình">
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    className="!text-muted-foreground hover:!text-foreground"
                  />
                </Tooltip>
              </Dropdown>
            )}

            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <div className="flex items-center gap-1.5 cursor-pointer hover:bg-muted px-2 py-1 rounded-md transition-colors">
                <Avatar
                  size={24}
                  style={{ backgroundColor: roleInfo?.color || "#1890ff" }}
                  icon={<UserOutlined />}
                />
                <div className="hidden md:block">
                  <div className="text-xs font-medium text-foreground leading-tight">
                    {user?.hoTen}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            background: "hsl(var(--background))",
            height: "calc(100vh - 48px)",
            overflow: "auto",
          }}
        >
          <div className="h-full" style={{ padding: 12 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>

    </Layout>
  );
};

export default MainLayout;
