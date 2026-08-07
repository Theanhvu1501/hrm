import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

import { isChamCongApp, getHomePath } from "./appTarget";
import { AuthProvider } from "./contexts/AuthContext";
import { TermProvider } from "./contexts/TermContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { YeuCauDangNhapChamCong } from "./components/YeuCauDangNhapChamCong";

import MainLayout from "./components/layout/MainLayout";
import EmployeeLayout from "./components/layout/EmployeeLayout";
import InstallPWA from "./components/shared/InstallPWA";
import PWAUpdatePrompt from "./components/shared/PWAUpdatePrompt";
import ManifestSync from "./pwa/ManifestSync";
import {
  LoginPage,
  ProfilePage,
  PhanQuyenPage,
  VaiTroPage,
  ThanhVienPage,
  CauHinhLuongPage,
  BangLuongPage,
  BangThemGioPage,
  PhieuLuongCuaToiPage,
  QuyetToanTncnPage,
  HoSoNhanVienPage,
  HopDongLaoDongPage,
  MauInHopDongPage,
  QuaTrinhCongTacPage,
  ThoiViecPage,
  CaLamViecPage,
  DiaDiemChamCongPage,
  DonChamCongPage,
  BangCongPage,
  NgayLePage,
  QuyPhepPage,
  QuyGioPage,
  ThietBiPage,
  BanGhiPage,
  CauHinhChamCongPage,
  ChamCongCuaToiPage,
  TrangChuTheoQuyen,
  TaiKhoanPage,
  DangNhapChamCongPage,
  BangCongSapCoPage,
  DonTuCuaToiPage,
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
          <ManifestSync />
          <AuthProvider>
            <TermProvider>
              <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  isChamCongApp ? (
                    <Navigate to={getHomePath()} replace />
                  ) : (
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  )
                }
              >
                <Route index element={<TrangChuTheoQuyen />} />
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
                    path="cau-hinh-luong"
                    element={
                      <ProtectedRoute requiredPermission="/luong/cau-hinh:xem">
                        <CauHinhLuongPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Lương */}
                <Route path="luong">
                  {/* Bảng lương thêm giờ khai TRƯỚC bảng lương chính: đúng
                      thứ tự quy trình (chốt bảng thêm giờ rồi mới tổng hợp
                      bảng lương), và cùng thứ tự với sidebar. */}
                  <Route
                    path="bang-luong-them-gio"
                    element={
                      <ProtectedRoute requiredPermission="/luong/bang-luong:xem">
                        <BangThemGioPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="bang-luong"
                    element={
                      <ProtectedRoute requiredPermission="/luong/bang-luong:xem">
                        <BangLuongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="quyet-toan-tncn"
                    element={
                      <ProtectedRoute requiredPermission="/luong/bang-luong:xem">
                        <QuyetToanTncnPage />
                      </ProtectedRoute>
                    }
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
                  {/* Soạn mẫu = sửa cấu hình in của hợp đồng, nên dùng chung
                      bộ quyền `/nhan-su/hop-dong-lao-dong:*`. Vào màn cần
                      `:xem`; nút Thêm/Lưu/Xoá trong màn tự ẩn theo `canEdit`. */}
                  <Route
                    path="mau-in-hop-dong"
                    element={
                      <ProtectedRoute requiredPermission="/nhan-su/hop-dong-lao-dong:xem">
                        <MauInHopDongPage />
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

                {/* Chấm công */}
                <Route path="cham-cong">
                  {/*
                    Tự phục vụ: MỌI nhân viên đăng nhập đều phải chấm công
                    được. CỐ Ý không bọc `requiredPermission` và CỐ Ý không
                    có mặt trong `routePermissions.ts` — gắn quyền vào đây sẽ
                    khiến người mới không chấm công được đúng ngày đầu tiên
                    đi làm, trong khi HR còn chưa kịp gán vai trò.
                    Đừng "sửa cho nhất quán" với các route bên dưới.
                    Backend cũng chỉ đặt JwtGuard cho check-in/check-out/
                    hom-nay (xem ban-ghi-cham-cong.controller.ts) — phạm vi
                    dữ liệu được khoá bằng employeeId suy từ token.
                  */}
                  {/*
                    Giữ lại làm redirect, KHÔNG xoá: link đã gửi cho nhân
                    viên qua tin nhắn, PWA shortcut và bookmark đều trỏ vào
                    đây. Vỏ nhân viên nay sống ở /toi.
                  */}
                  <Route
                    path="cua-toi"
                    element={<Navigate to="/toi/cham-cong" replace />}
                  />
                  <Route
                    path="ca-lam-viec"
                    element={
                      <ProtectedRoute requiredPermission="/cham-cong/ca-lam-viec:xem">
                        <CaLamViecPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="dia-diem"
                    element={
                      <ProtectedRoute requiredPermission="/cham-cong/dia-diem:xem">
                        <DiaDiemChamCongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="don-tu"
                    element={
                      <ProtectedRoute requiredPermission="/cham-cong/don-tu:xem">
                        <DonChamCongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="bang-cong"
                    element={
                      <ProtectedRoute requiredPermission="/cham-cong/bang-cong:xem">
                        <BangCongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="ngay-le"
                    element={
                      <ProtectedRoute requiredPermission="/cham-cong/ngay-le:xem">
                        <NgayLePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="quy-phep"
                    element={
                      <ProtectedRoute requiredPermission="/cham-cong/quy-phep:xem">
                        <QuyPhepPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="quy-gio"
                    element={
                      <ProtectedRoute requiredPermission="/cham-cong/quy-gio:xem">
                        <QuyGioPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="thiet-bi"
                    element={
                      <ProtectedRoute requiredPermission="/cham-cong/thiet-bi:xem">
                        <ThietBiPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="ban-ghi"
                    element={
                      <ProtectedRoute requiredPermission="/cham-cong/ban-ghi:xem">
                        <BanGhiPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="cau-hinh"
                    element={
                      <ProtectedRoute requiredPermission="/cham-cong/cau-hinh:xem">
                        <CauHinhChamCongPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>
              </Route>

              {/*
                Cổng đăng nhập của vỏ nhân viên. PHẢI nằm NGOÀI
                YeuCauDangNhapChamCong — bọc vào trong thì nó tự chuyển hướng
                vào chính nó, thành vòng lặp vô hạn.
              */}
              <Route path="/toi/login" element={<DangNhapChamCongPage />} />

              {/*
                Vỏ nhân viên. Dùng YeuCauDangNhapChamCong chứ KHÔNG dùng
                ProtectedRoute: ProtectedRoute đá sang /login rồi bật tiếp sang
                Portal, và cổng chấm công sẽ không bao giờ được nhìn thấy.

                CỐ Ý không kiểm quyền và CỐ Ý không khai trong
                routePermissions.ts — mọi nhân viên đăng nhập đều phải chấm công
                được ngay ngày đầu đi làm, trước khi HR kịp gán vai trò.
              */}
              <Route
                path="/toi"
                element={
                  <YeuCauDangNhapChamCong>
                    <EmployeeLayout />
                  </YeuCauDangNhapChamCong>
                }
              >
                <Route index element={<Navigate to="cham-cong" replace />} />
                <Route path="cham-cong" element={<ChamCongCuaToiPage />} />
                <Route path="don-tu" element={<DonTuCuaToiPage />} />
                <Route path="bang-cong" element={<BangCongSapCoPage />} />
                <Route path="phieu-luong" element={<PhieuLuongCuaToiPage />} />
                <Route path="tai-khoan" element={<TaiKhoanPage />} />
              </Route>

              <Route
                path="*"
                element={
                  isChamCongApp ? <Navigate to={getHomePath()} replace /> : <NotFound />
                }
              />
                </Routes>
            </TermProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ConfigProvider>
  </QueryClientProvider>
);

export default App;