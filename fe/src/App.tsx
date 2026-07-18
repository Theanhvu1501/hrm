import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

import { AuthProvider } from "./contexts/AuthContext";
import { TermProvider } from "./contexts/TermContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

import MainLayout from "./components/layout/MainLayout";
import InstallPWA from "./components/shared/InstallPWA";
import PWAUpdatePrompt from "./components/shared/PWAUpdatePrompt";
import {
  LoginPage,
  ProfilePage,
  PhanQuyenPage,
  VaiTroPage,
  ThanhVienPage,
  TenantPage,
  LinhVucPage,
  HoSoNhanVienPage,
  HopDongLaoDongPage,
  QuaTrinhCongTacPage,
  ThoiViecPage,
  NotFound
} from "./pages/loadable";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          // Màu thương hiệu MasterCEO: teal logo (gold #b6954e dùng làm accent).
          colorPrimary: '#1f7769',
          // Đồng bộ toàn dự án: bo góc = 0 (giữ tròn cho avatar/chấm/spinner riêng).
          borderRadius: 0,
          borderRadiusLG: 0,
          borderRadiusSM: 0,
          borderRadiusXS: 0,
          // Đợt 2: chiều cao control đồng nhất (compact).
          controlHeight: 28,
          controlHeightSM: 24,
          controlHeightLG: 36,
        },
        components: {
          // Card header + body padding 12px đồng bộ nhịp 12
          // (var --ant-card-header-padding / --ant-card-body-padding).
          Card: { headerPadding: 12, bodyPadding: 12 },
        },
      }}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdatePrompt />
        <InstallPWA />
        <BrowserRouter>
          <AuthProvider>
            <TermProvider>
              <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/cau-hinh/vai-tro" replace />} />
                <Route path="profile" element={<ProfilePage />} />

                {/* Cấu hình */}
                <Route path="cau-hinh">
                  <Route
                    path="phan-quyen"
                    element={
                      <ProtectedRoute requiredPermission="/cau-hinh/phan-quyen:xem">
                        <PhanQuyenPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="vai-tro"
                    element={
                      <ProtectedRoute requiredPermission="/cau-hinh/vai-tro:xem">
                        <VaiTroPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="thanh-vien"
                    element={
                      <ProtectedRoute requiredPermission="/cau-hinh/thanh-vien:xem">
                        <ThanhVienPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="tenant"
                    element={<TenantPage />}
                  />
                  <Route
                    path="linh-vuc"
                    element={<LinhVucPage />}
                  />
                </Route>

                {/* Nhân sự */}
                <Route path="nhan-su">
                  <Route
                    path="ho-so-nhan-vien"
                    element={
                      <ProtectedRoute requiredPermission="/nhan-su/ho-so-nhan-vien:xem">
                        <HoSoNhanVienPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="hop-dong-lao-dong"
                    element={
                      <ProtectedRoute requiredPermission="/nhan-su/hop-dong-lao-dong:xem">
                        <HopDongLaoDongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="qua-trinh-cong-tac"
                    element={
                      <ProtectedRoute requiredPermission="/nhan-su/qua-trinh-cong-tac:xem">
                        <QuaTrinhCongTacPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="thoi-viec"
                    element={
                      <ProtectedRoute requiredPermission="/nhan-su/thoi-viec:xem">
                        <ThoiViecPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
                </Routes>
            </TermProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ConfigProvider>
  </QueryClientProvider>
);

export default App;