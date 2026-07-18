export interface MenuCatalogEntry {
  key: string; // = path route, vd '/danh-muc/tai-khoan'
  label: string; // 'Tài khoản'
  parentLabel?: string; // 'Danh mục' (nhóm cha), undefined nếu là mục gốc
}

// Nguồn: fe/src/components/layout/MainLayout.tsx
// (dieuHanhMenuItems, keToAnMenuItems, thuVienMenuItems).
// Mỗi entry là MỘT mục lá (có route thật) trong sidebar.
// CẬP NHẬT danh sách này khi thêm/sửa menu ở MainLayout.
export const MENU_CATALOG: MenuCatalogEntry[] = [
  // ===== ĐIỀU HÀNH =====
  { key: '/', label: 'Tổng quan' },
  { key: '/phan-tich/bao-cao-tai-chinh', label: 'Kế toán', parentLabel: 'Phân tích' },
  { key: '/phan-tich/ban-hang', label: 'Bán hàng', parentLabel: 'Phân tích' },
  { key: '/phan-tich/mua-hang', label: 'Mua hàng', parentLabel: 'Phân tích' },
  { key: '/phan-tich/cong-no', label: 'Công nợ', parentLabel: 'Phân tích' },
  { key: '/phan-tich/dong-tien', label: 'Dòng tiền', parentLabel: 'Phân tích' },
  { key: '/phan-tich/ton-kho', label: 'Tồn kho', parentLabel: 'Phân tích' },
  { key: '/phan-tich/thanh-khoan', label: 'Khả năng thanh khoản', parentLabel: 'Phân tích' },

  // ===== KẾ TOÁN — Báo cáo =====
  { key: '/bao-cao/tai-chinh', label: 'Báo cáo tài chính', parentLabel: 'Báo cáo' },
  { key: '/bao-cao/so-chi-tiet-tai-khoan', label: 'Sổ chi tiết tài khoản', parentLabel: 'Báo cáo' },
  { key: '/bao-cao/so-chi-tiet-cong-no', label: 'Sổ chi tiết công nợ', parentLabel: 'Báo cáo' },
  { key: '/bao-cao/so-chi-tiet-phat-sinh', label: 'Sổ chi tiết phát sinh', parentLabel: 'Báo cáo' },
  { key: '/bao-cao/bang-tong-hop', label: 'Bảng tổng hợp', parentLabel: 'Báo cáo' },
  { key: '/bao-cao/hop-dong', label: 'Báo cáo hợp đồng', parentLabel: 'Báo cáo' },

  // ===== KẾ TOÁN — Thuế =====
  { key: '/thue/bang-ke-mua-vao', label: 'Bảng kê mua vào', parentLabel: 'Thuế' },
  { key: '/thue/bang-ke-ban-ra', label: 'Bảng kê bán ra', parentLabel: 'Thuế' },
  { key: '/thue/tong-hop', label: 'Tổng hợp thuế', parentLabel: 'Thuế' },
  { key: '/thue/bao-cao-tndn', label: 'Báo cáo nhanh thuế TNDN', parentLabel: 'Thuế' },

  // ===== KẾ TOÁN — Trung tâm dữ liệu =====
  { key: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/trung-tam-du-lieu/du-bao', label: 'Dự báo', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/chung-tu/nhat-ky-chung', label: 'Dữ liệu tổng hợp', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/trung-tam-du-lieu/tai-san', label: 'Quản lý Tài sản', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/trung-tam-du-lieu/hang-hoa', label: 'Quản lý Hàng hóa', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/trung-tam-du-lieu/nguyen-lieu', label: 'Quản lý Nguyên liệu', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/trung-tam-du-lieu/dung-cu', label: 'Quản lý Dụng cụ', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/trung-tam-du-lieu/hop-dong', label: 'Quản lý Hợp đồng', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/trung-tam-du-lieu/thu-tien-hop-dong', label: 'Thu tiền hợp đồng', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/trung-tam-du-lieu/hd-ban-ra', label: 'Hóa đơn bán ra', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/trung-tam-du-lieu/nhan-su', label: 'Quản lý nhân sự', parentLabel: 'Trung tâm dữ liệu' },
  { key: '/trung-tam-du-lieu/luong-bhxh', label: 'Lương & BHXH', parentLabel: 'Trung tâm dữ liệu' },

  // ===== KẾ TOÁN — Chứng từ =====
  { key: '/chung-tu/phieu-thu', label: 'Phiếu thu', parentLabel: 'Chứng từ' },
  { key: '/chung-tu/phieu-chi', label: 'Phiếu chi', parentLabel: 'Chứng từ' },
  { key: '/chung-tu/phieu-nhap', label: 'Phiếu nhập', parentLabel: 'Chứng từ' },
  { key: '/chung-tu/phieu-xuat', label: 'Phiếu xuất', parentLabel: 'Chứng từ' },
  { key: '/chung-tu/phieu-luong', label: 'Phiếu lương', parentLabel: 'Chứng từ' },
  { key: '/chung-tu/bang-tinh-luong', label: 'Bảng tính lương', parentLabel: 'Chứng từ' },
  { key: '/chung-tu/bang-cham-cong', label: 'Bảng chấm công', parentLabel: 'Chứng từ' },
  { key: '/chung-tu/cham-cong-lam-them', label: 'Bảng chấm công làm thêm giờ', parentLabel: 'Chứng từ' },
  { key: '/chung-tu/phan-bo-khau-hao', label: 'Bảng phân bổ khấu hao TSCĐ', parentLabel: 'Chứng từ' },
  { key: '/chung-tu/phieu-ke-toan', label: 'Phiếu kế toán', parentLabel: 'Chứng từ' },
  { key: '/chung-tu/de-nghi-thanh-toan', label: 'Đề nghị thanh toán', parentLabel: 'Chứng từ' },

  // ===== KẾ TOÁN — Kho =====
  { key: '/kho/nhap-kho', label: 'Nhập kho', parentLabel: 'Kho' },
  { key: '/kho/xuat-kho', label: 'Xuất kho', parentLabel: 'Kho' },
  { key: '/kho/chuyen-kho', label: 'Chuyển kho', parentLabel: 'Kho' },

  // ===== KẾ TOÁN — Bếp ăn =====
  { key: '/bep-an/dinh-muc-tien-an', label: 'Định mức tiền ăn', parentLabel: 'Bếp ăn' },
  { key: '/bep-an/cong-thuc-dinh-luong', label: 'Công thức định lượng', parentLabel: 'Bếp ăn' },
  { key: '/bep-an/diem-danh-an', label: 'Điểm danh ăn', parentLabel: 'Bếp ăn' },
  { key: '/bep-an/de-xuat-mua', label: 'Đề xuất mua thực phẩm', parentLabel: 'Bếp ăn' },
  { key: '/bep-an/kiem-soat-chi-phi', label: 'Bảng kiểm soát chi phí', parentLabel: 'Bếp ăn' },

  // ===== THƯ VIỆN — Danh mục =====
  { key: '/danh-muc/tai-khoan', label: 'Tài khoản', parentLabel: 'Danh mục' },
  { key: '/danh-muc/doi-tuong', label: 'Đối tượng', parentLabel: 'Danh mục' },
  { key: '/danh-muc/du-an', label: 'Dự án', parentLabel: 'Danh mục' },
  { key: '/danh-muc/san-pham', label: 'Sản phẩm', parentLabel: 'Danh mục' },
  { key: '/danh-muc/hop-dong', label: 'Hợp đồng', parentLabel: 'Danh mục' },
  { key: '/danh-muc/bo-phan', label: 'Bộ phận', parentLabel: 'Danh mục' },
  { key: '/danh-muc/khoan-muc', label: 'Khoản mục', parentLabel: 'Danh mục' },
  { key: '/danh-muc/so-du-dau-ky', label: 'Số dư đầu kỳ', parentLabel: 'Danh mục' },
  { key: '/danh-muc/kho', label: 'Kho', parentLabel: 'Danh mục' },
  { key: '/danh-muc/hang-hoa-vat-tu', label: 'Hàng hóa vật tư', parentLabel: 'Danh mục' },
  { key: '/danh-muc/don-vi-tinh', label: 'Đơn vị tính', parentLabel: 'Danh mục' },
  { key: '/danh-muc/ly-do-khong-hop-le', label: 'Lý do không hợp lệ', parentLabel: 'Danh mục' },
  { key: '/danh-muc/nhom-vat-tu', label: 'Nhóm vật tư', parentLabel: 'Danh mục' },

  // ===== THƯ VIỆN — Danh mục › Khác =====
  { key: '/danh-muc/chu-dau-tu', label: 'Chủ đầu tư', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/nhom-khoan-muc', label: 'Nhóm khoản mục', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/ngan-hang', label: 'Ngân hàng & Quỹ', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/dong-tien', label: 'Dòng tiền', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/nhom-khuyen-mai', label: 'Nhóm khuyến mại', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/nhom-quan-ly', label: 'Nhóm quản lý', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/loai-chung-tu', label: 'Loại chứng từ', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/loai-giao-dich', label: 'Loại giao dịch', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/quy-chuan', label: 'Quy chuẩn hạch toán', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/ho-so-chung-tu', label: 'Hồ sơ chứng từ', parentLabel: 'Danh mục › Khác' },

  // ===== THƯ VIỆN — gốc =====
  { key: '/cau-hinh/linh-vuc', label: 'Lĩnh vực', parentLabel: 'Cấu hình' },
  { key: '/quy-trinh', label: 'Quy trình' },
  { key: '/chinh-sach', label: 'Chính sách' },
  { key: '/bieu-mau', label: 'Biểu mẫu' },
  { key: '/huong-dan', label: 'Hướng dẫn' },
];

// Tất cả menu key (path) trong catalog — tiện cho việc gom/đối chiếu.
export const flattenMenuKeys = (
  entries: MenuCatalogEntry[] = MENU_CATALOG,
): string[] => entries.map((e) => e.key);
