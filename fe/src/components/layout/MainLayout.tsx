import React, { useState, useEffect } from "react";
import {
  Layout,
  Avatar,
  Dropdown,
  Button,
  Tooltip,
  Tag,
  message,
} from "antd";
import {
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  DownloadOutlined,
  MenuOutlined,
  SafetyCertificateOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import type { MenuProps } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { TenantSwitcher } from "./TenantSwitcher";
import { AppSwitcher } from "./AppSwitcher";
import { OIconApp } from "@/components/icons/OIconApp";
import { CURRENT_APP_ID } from "@/services/identitySession";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar, MobileMenu } from "./sidebar";
import { BE_RONG_MO } from "./sidebar/Sidebar";

const { Header, Content } = Layout;

// Ảnh avatar thật của user được identity-service phục vụ; ?v= để bust cache khi avatar đổi.
const IDENTITY_URL = import.meta.env.VITE_IDENTITY_URL as string | undefined;

// Mobile/tablet (gồm iPad iPadOS 13+ báo là Macintosh) → hiện mục "Cài đặt ứng dụng" trong menu user.
const IS_MOBILE_OR_TABLET =
  /android|iphone|ipod|ipad/i.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

const MainLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, currentTenant, hasPermission } = useAuth();
  const currentRole = currentTenant?.role;
  const isMobile = useIsMobile();

  const roleInfo = currentRole ? { label: currentRole, color: 'blue' } : null;
  const avatarUrl =
    IDENTITY_URL && user?.id && user?.avatarUpdatedAt
      ? `${IDENTITY_URL.replace(/\/$/, "")}/api/users/${user.id}/avatar?v=${encodeURIComponent(user.avatarUpdatedAt)}`
      : undefined;

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    logout();
    message.success("Đã đăng xuất thành công");
    navigate("/login");
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

  const canManageConfig = hasPermission('/cau-hinh/vai-tro:xem') || hasPermission('/cau-hinh/phan-quyen:xem') || hasPermission('/cau-hinh/thanh-vien:xem') || hasPermission('/luong/cau-hinh:xem') || user?.isSuperAdmin;

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
      ...(hasPermission('/luong/cau-hinh:xem') || user?.isSuperAdmin ? [{
        key: "cau-hinh-luong",
        icon: <DollarOutlined />,
        label: "Cấu hình lương",
        onClick: () => navigate("/cau-hinh/cau-hinh-luong"),
      }] : []),
    ] : []),
  ];

  return (
    <Layout className="min-h-screen">
      {isMobile ? (
        <MobileMenu
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      ) : (
        // Sidebar tự công bố bề rộng ra biến CSS --sidebar-w; thẻ bọc chỉ ghim
        // nó vào mép trái, không được đoán bề rộng thay nó.
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            height: "100vh",
            zIndex: 100,
          }}
        >
          <Sidebar />
        </div>
      )}

      {/* Main Content Area */}
      <Layout
        style={{
          marginLeft: isMobile ? 0 : `var(--sidebar-w, ${BE_RONG_MO}px)`,
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
            {/* App Switcher — lưới 9 chấm, mở màn chọn ứng dụng */}
            <AppSwitcher />

            {/* Nhận diện app đang mở: ô icon + tên app. Tên CÔNG TY nằm bên
                phải header (TenantSwitcher), đừng nhầm hai thứ. Ô 28px này
                thay luôn khối "KT" cũ trên mobile. */}
            <div className="flex items-center gap-2">
              <OIconApp appId={CURRENT_APP_ID} size={28} />
              <span className="hidden sm:inline text-sm font-bold text-foreground">
                Nhân sự
              </span>
            </div>
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
                  src={avatarUrl}
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
