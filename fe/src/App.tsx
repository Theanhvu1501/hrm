import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
  Dashboard,
  ProfilePage,
  TaiKhoanPage,
  DoiTuongPage,
  SanPhamPage,
  DinhMucTienAnPage,
  CongThucDinhLuongPage,
  DiemDanhAnPage,
  DeXuatMuaPage,
  KiemSoatChiPhiPage,
  NhapKhoPage,
  XuatKhoPage,
  ChuyenKhoPage,
  DuAnPage,
  BoPhanPage,
  KhoanMucPage,
  SoDuDauKyPage,
  NganHangPage,
  DongTienPage,
  ChuDauTuPage,
  NhomKhuyenMaiPage,
  NhomQuanLyPage,
  LoaiChungTuPage,
  NhomKhoanMucPage,
  LoaiGiaoDichPage,
  HopDongPage,
  KhoPage,
  DonViTinhPage,
  LyDoKhongHopLePage,
  NhomVatTuPage,
  HangHoaVatTuPage,
  PhieuThuPage,
  PhieuChiPage,
  NhatKyChungPage,
  NhatKyChungFormPage,
  SoQuyPage,
  CongNoPhaiThuPage,
  CongNoPhaiTraPage,
  PnLPage,
  SoCaiPage,
  SoChiTietTaiKhoanPage,
  BangCanDoiPage,
  BangTongHopCongNoPage,
  BaoCaoTaiChinhPage,

  BieuMauPage,
  ChinhSachPage,
  HuongDanPage,
  QuyChaunPage,
  HoSoChungTuPage,
  PhanQuyenPage,
  VaiTroPage,
  ThanhVienPage,
  TenantPage,
  LinhVucPage,
  SaoChepDanhMucPage,
  ComingSoonPage,
  QuanLyHopDongPage,
  BaoCaoHopDongPage,
  SoThuTienPage,
  SoHoaDonBanRaPage,
  BangKeMuaVaoPage,
  BangKeBanRaPage,
  TongHopThuePage,
  BaoCaoTNDNPage,
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
                <Route index element={<Dashboard />} />
                <Route path="profile" element={<ProfilePage />} />
                
                {/* Danh mục */}
                <Route path="danh-muc">
                  <Route
                    path="tai-khoan"
                    element={
                      <ProtectedRoute requiredPermission="/danh-muc/tai-khoan:xem">
                        <TaiKhoanPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="doi-tuong"
                    element={
                      <ProtectedRoute requiredPermission="/danh-muc/doi-tuong:xem">
                        <DoiTuongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="du-an" element={
                    <ProtectedRoute requiredPermission="/danh-muc/du-an:xem">
                      <DuAnPage />
                    </ProtectedRoute>
                  } />
                  <Route path="san-pham" element={
                    <ProtectedRoute requiredPermission="/danh-muc/san-pham:xem">
                      <SanPhamPage />
                    </ProtectedRoute>
                  } />
                  <Route path="bo-phan" element={
                    <ProtectedRoute requiredPermission="/danh-muc/bo-phan:xem">
                      <BoPhanPage />
                    </ProtectedRoute>
                  } />
                  <Route path="khoan-muc" element={
                    <ProtectedRoute requiredPermission="/danh-muc/khoan-muc:xem">
                      <KhoanMucPage />
                    </ProtectedRoute>
                  } />
                  <Route path="so-du-dau-ky" element={
                    <ProtectedRoute requiredPermission="/danh-muc/so-du-dau-ky:xem">
                      <SoDuDauKyPage />
                    </ProtectedRoute>
                  } />
                  <Route path="ngan-hang" element={
                    <ProtectedRoute requiredPermission="/danh-muc/ngan-hang:xem">
                      <NganHangPage />
                    </ProtectedRoute>
                  } />
                  <Route path="dong-tien" element={
                    <ProtectedRoute requiredPermission="/danh-muc/dong-tien:xem">
                      <DongTienPage />
                    </ProtectedRoute>
                  } />
                  <Route path="chu-dau-tu" element={
                    <ProtectedRoute requiredPermission="/danh-muc/chu-dau-tu:xem">
                      <ChuDauTuPage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhom-khuyen-mai" element={
                    <ProtectedRoute requiredPermission="/danh-muc/nhom-khuyen-mai:xem">
                      <NhomKhuyenMaiPage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhom-quan-ly" element={
                    <ProtectedRoute requiredPermission="/danh-muc/nhom-quan-ly:xem">
                      <NhomQuanLyPage />
                    </ProtectedRoute>
                  } />
                  <Route path="loai-chung-tu" element={
                    <ProtectedRoute requiredPermission="/danh-muc/loai-chung-tu:xem">
                      <LoaiChungTuPage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhom-khoan-muc" element={
                    <ProtectedRoute requiredPermission="/danh-muc/nhom-khoan-muc:xem">
                      <NhomKhoanMucPage />
                    </ProtectedRoute>
                  } />
                  <Route path="loai-giao-dich" element={
                    <ProtectedRoute requiredPermission="/danh-muc/loai-giao-dich:xem">
                      <LoaiGiaoDichPage />
                    </ProtectedRoute>
                  } />
                  <Route path="hop-dong" element={
                    <ProtectedRoute requiredPermission="/danh-muc/hop-dong:xem">
                      <HopDongPage />
                    </ProtectedRoute>
                  } />
                  <Route
                    path="quy-chuan"
                    element={
                      <ProtectedRoute requiredPermission="/danh-muc/quy-chuan:xem">
                        <QuyChaunPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="ho-so-chung-tu" element={
                    <ProtectedRoute requiredPermission="/danh-muc/ho-so-chung-tu:xem">
                      <HoSoChungTuPage />
                    </ProtectedRoute>
                  } />
                  <Route path="kho" element={
                    <ProtectedRoute requiredPermission="/danh-muc/kho:xem">
                      <KhoPage />
                    </ProtectedRoute>
                  } />
                  <Route path="don-vi-tinh" element={
                    <ProtectedRoute requiredPermission="/danh-muc/don-vi-tinh:xem">
                      <DonViTinhPage />
                    </ProtectedRoute>
                  } />
                  <Route path="ly-do-khong-hop-le" element={
                    <ProtectedRoute requiredPermission="/danh-muc/ly-do-khong-hop-le:xem">
                      <LyDoKhongHopLePage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhom-vat-tu" element={
                    <ProtectedRoute requiredPermission="/danh-muc/nhom-vat-tu:xem">
                      <NhomVatTuPage />
                    </ProtectedRoute>
                  } />
                  <Route path="hang-hoa-vat-tu" element={
                    <ProtectedRoute requiredPermission="/danh-muc/hang-hoa-vat-tu:xem">
                      <HangHoaVatTuPage />
                    </ProtectedRoute>
                  } />
                </Route>

                {/* Chứng từ */}
                <Route path="chung-tu">
                  <Route
                    path="phieu-thu"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/phieu-thu:xem">
                        <PhieuThuPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="phieu-chi"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/phieu-chi:xem">
                        <PhieuChiPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="nhat-ky-chung"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/nhat-ky-chung:xem">
                        <NhatKyChungPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="nhat-ky-chung/tao-moi"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/nhat-ky-chung:xem">
                        <NhatKyChungFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="nhat-ky-chung/:soPhieu/sua"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/nhat-ky-chung:xem">
                        <NhatKyChungFormPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Coming Soon */}
                  <Route path="phieu-nhap" element={<ComingSoonPage />} />
                  <Route path="phieu-xuat" element={<ComingSoonPage />} />
                  <Route path="phieu-luong" element={<ComingSoonPage />} />
                  <Route path="bang-tinh-luong" element={<ComingSoonPage />} />
                  <Route path="bang-cham-cong" element={<ComingSoonPage />} />
                  <Route path="cham-cong-lam-them" element={<ComingSoonPage />} />
                  <Route path="phan-bo-khau-hao" element={<ComingSoonPage />} />
                  <Route path="phieu-ke-toan" element={<ComingSoonPage />} />
                  <Route path="de-nghi-thanh-toan" element={<ComingSoonPage />} />
                </Route>

                {/* Bếp ăn */}
                <Route path="bep-an">
                  <Route
                    path="dinh-muc-tien-an"
                    element={
                      <ProtectedRoute requiredPermission="/bep-an/dinh-muc-tien-an:xem">
                        <DinhMucTienAnPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="cong-thuc-dinh-luong"
                    element={
                      <ProtectedRoute requiredPermission="/bep-an/cong-thuc-dinh-luong:xem">
                        <CongThucDinhLuongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="diem-danh-an"
                    element={
                      <ProtectedRoute requiredPermission="/bep-an/diem-danh-an:xem">
                        <DiemDanhAnPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="de-xuat-mua"
                    element={
                      <ProtectedRoute requiredPermission="/bep-an/de-xuat-mua:xem">
                        <DeXuatMuaPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="kiem-soat-chi-phi"
                    element={
                      <ProtectedRoute requiredPermission="/bep-an/kiem-soat-chi-phi:xem">
                        <KiemSoatChiPhiPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Kho */}
                <Route path="kho">
                  <Route
                    path="nhap-kho"
                    element={
                      <ProtectedRoute requiredPermission="/kho/nhap-kho:xem">
                        <NhapKhoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="xuat-kho"
                    element={
                      <ProtectedRoute requiredPermission="/kho/xuat-kho:xem">
                        <XuatKhoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="chuyen-kho"
                    element={
                      <ProtectedRoute requiredPermission="/kho/chuyen-kho:xem">
                        <ChuyenKhoPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Sổ quỹ */}
                <Route
                  path="so-quy"
                  element={
                    <ProtectedRoute requiredPermission="/so-quy:xem">
                      <SoQuyPage />
                    </ProtectedRoute>
                  }
                />

                {/* Công nợ */}
                <Route path="cong-no">
                  <Route
                    path="phai-thu"
                    element={
                      <ProtectedRoute requiredPermission="/cong-no/phai-thu:xem">
                        <CongNoPhaiThuPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="phai-tra"
                    element={
                      <ProtectedRoute requiredPermission="/cong-no/phai-tra:xem">
                        <CongNoPhaiTraPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Báo cáo */}
                <Route path="bao-cao">
                  <Route
                    path="pnl"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/pnl:xem">
                        <PnLPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="so-cai"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/so-cai:xem">
                        <SoCaiPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="bang-can-doi"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/bang-can-doi:xem">
                        <BangCanDoiPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Coming Soon */}
                  <Route
                    path="tai-chinh"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/tai-chinh:xem">
                        <BaoCaoTaiChinhPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="so-chi-tiet-tai-khoan"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/so-chi-tiet-tai-khoan:xem">
                        <SoChiTietTaiKhoanPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="so-chi-tiet-cong-no" element={<ComingSoonPage />} />
                  <Route path="so-chi-tiet-phat-sinh" element={<ComingSoonPage />} />
                  <Route
                    path="bang-tong-hop"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/bang-tong-hop:xem">
                        <BangTongHopCongNoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="hop-dong"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/hop-dong:xem">
                        <BaoCaoHopDongPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Thuế */}
                <Route path="thue">
                  <Route
                    path="bang-ke-mua-vao"
                    element={
                      <ProtectedRoute requiredPermission="/thue/bang-ke-mua-vao:xem">
                        <BangKeMuaVaoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="bang-ke-ban-ra"
                    element={
                      <ProtectedRoute requiredPermission="/thue/bang-ke-ban-ra:xem">
                        <BangKeBanRaPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="tong-hop"
                    element={
                      <ProtectedRoute requiredPermission="/thue/tong-hop:xem">
                        <TongHopThuePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="bao-cao-tndn"
                    element={
                      <ProtectedRoute requiredPermission="/thue/bao-cao-tndn:xem">
                        <BaoCaoTNDNPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Phân tích - Coming Soon */}
                <Route path="phan-tich">
                  <Route path="bao-cao-tai-chinh" element={<ComingSoonPage />} />
                  <Route path="ban-hang" element={<ComingSoonPage />} />
                  <Route path="mua-hang" element={<ComingSoonPage />} />
                  <Route path="cong-no" element={<ComingSoonPage />} />
                  <Route path="dong-tien" element={<ComingSoonPage />} />
                  <Route path="ton-kho" element={<ComingSoonPage />} />
                  <Route path="thanh-khoan" element={<ComingSoonPage />} />
                </Route>

                {/* Trung tâm dữ liệu - Coming Soon */}
                <Route path="trung-tam-du-lieu">
                  <Route path="ke-hoach" element={<ComingSoonPage />} />
                  <Route path="du-bao" element={<ComingSoonPage />} />
                  <Route path="tai-san" element={<ComingSoonPage />} />
                  <Route path="hang-hoa" element={<ComingSoonPage />} />
                  <Route path="nguyen-lieu" element={<ComingSoonPage />} />
                  <Route path="dung-cu" element={<ComingSoonPage />} />
                  <Route path="hop-dong" element={
                    <ProtectedRoute requiredPermission="/trung-tam-du-lieu/hop-dong:xem">
                      <QuanLyHopDongPage />
                    </ProtectedRoute>
                  } />
                  <Route path="thu-tien-hop-dong" element={
                    <ProtectedRoute requiredPermission="/trung-tam-du-lieu/thu-tien-hop-dong:xem">
                      <SoThuTienPage />
                    </ProtectedRoute>
                  } />
                  <Route path="hd-ban-ra" element={
                    <ProtectedRoute requiredPermission="/trung-tam-du-lieu/hd-ban-ra:xem">
                      <SoHoaDonBanRaPage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhan-su" element={<ComingSoonPage />} />
                  <Route path="luong-bhxh" element={<ComingSoonPage />} />
                </Route>

                {/* Thư viện */}
                <Route path="quy-trinh" element={<ComingSoonPage />} />
                <Route
                  path="chinh-sach"
                  element={
                    <ProtectedRoute requiredPermission="/chinh-sach:xem">
                      <ChinhSachPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="bieu-mau"
                  element={
                    <ProtectedRoute requiredPermission="/bieu-mau:xem">
                      <BieuMauPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="huong-dan"
                  element={
                    <ProtectedRoute requiredPermission="/huong-dan:xem">
                      <HuongDanPage />
                    </ProtectedRoute>
                  }
                />

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
                  <Route
                    path="sao-chep-danh-muc"
                    element={<SaoChepDanhMucPage />}
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