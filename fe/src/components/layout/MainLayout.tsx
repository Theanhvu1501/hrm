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
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  DownloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  MenuOutlined,
  CloseOutlined,
  TeamOutlined,
  HomeOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import type { MenuProps } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { TenantSwitcher } from "./TenantSwitcher";
import { AppSwitcher } from "./AppSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

// Mobile/tablet (gồm iPad iPadOS 13+ báo là Macintosh) → hiện mục "Cài đặt ứng dụng" trong menu user.
const IS_MOBILE_OR_TABLET =
  /android|iphone|ipod|ipad/i.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

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
  const { user, logout, currentTenant, hasPermission } = useAuth();
  const currentRole = currentTenant?.role;
  const isMobile = useIsMobile();

  const roleInfo = currentRole ? { label: currentRole, color: 'blue' } : null;

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

  const canViewHoSoNhanVien = hasPermission('/nhan-su/ho-so-nhan-vien:xem') || user?.isSuperAdmin;

  // Sider: mục "Trang chủ" (P1) + section "NHÂN SỰ" (Phase 2+), thêm dần theo module.
  const siderMenuItems: MenuItem[] = [
    {
      key: "/",
      icon: <HomeOutlined />,
      label: "Trang chủ",
    },
    ...(canViewHoSoNhanVien ? [{
      key: "nhan-su-group",
      type: "group" as const,
      label: "NHÂN SỰ",
      children: [
        {
          key: "/nhan-su/ho-so-nhan-vien",
          icon: <IdcardOutlined />,
          label: "Hồ sơ nhân viên",
        },
      ],
    }] : []),
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
  ];

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === "/") return ["/"];
    return [path];
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
      <div className="sidebar-section">
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={siderMenuItems}
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
            <div className="sidebar-section">
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={getSelectedKeys()}
                items={siderMenuItems}
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
