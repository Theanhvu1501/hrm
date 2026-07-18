import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Result } from "antd";
import {
  RocketOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
} from "@ant-design/icons";

// Map path to Vietnamese title
const pathTitles: Record<string, string> = {
  // Phân tích
  "/phan-tich/bao-cao-tai-chinh": "Phân tích Báo cáo tài chính",
  "/phan-tich/ban-hang": "Phân tích Bán hàng",
  "/phan-tich/mua-hang": "Phân tích Mua hàng",
  "/phan-tich/cong-no": "Phân tích Công nợ",
  "/phan-tich/dong-tien": "Phân tích Dòng tiền",
  "/phan-tich/ton-kho": "Phân tích Tồn kho",
  "/phan-tich/thanh-khoan": "Phân tích Khả năng thanh khoản",

  // Báo cáo
  "/bao-cao/so-chi-tiet-tai-khoan": "Sổ chi tiết tài khoản",
  "/bao-cao/so-chi-tiet-cong-no": "Sổ chi tiết công nợ",
  "/bao-cao/so-chi-tiet-phat-sinh": "Sổ chi tiết phát sinh",
  "/bao-cao/bang-tong-hop": "Bảng tổng hợp",

  // Trung tâm dữ liệu
  "/trung-tam-du-lieu/ke-hoach": "Kế hoạch",
  "/trung-tam-du-lieu/du-bao": "Dự báo",
  "/trung-tam-du-lieu/tai-san": "Quản lý Tài sản",
  "/trung-tam-du-lieu/hang-hoa": "Quản lý Hàng hóa",
  "/trung-tam-du-lieu/nguyen-lieu": "Quản lý Nguyên liệu",
  "/trung-tam-du-lieu/dung-cu": "Quản lý Dụng cụ",
  "/trung-tam-du-lieu/hop-dong": "Quản lý Hợp đồng",
  "/trung-tam-du-lieu/nhan-su": "Quản lý Nhân sự",
  "/trung-tam-du-lieu/luong-bhxh": "Lương & BHXH",

  // Chứng từ
  "/chung-tu/phieu-thu": "Phiếu thu",
  "/chung-tu/phieu-chi": "Phiếu chi",
  "/chung-tu/phieu-nhap": "Phiếu nhập",
  "/chung-tu/phieu-xuat": "Phiếu xuất",
  "/chung-tu/phieu-luong": "Phiếu lương",
  "/chung-tu/bang-tinh-luong": "Bảng tính lương",
  "/chung-tu/bang-cham-cong": "Bảng chấm công",
  "/chung-tu/cham-cong-lam-them": "Bảng chấm công làm thêm giờ",
  "/chung-tu/phan-bo-khau-hao": "Bảng phân bổ khấu hao TSCĐ",
  "/chung-tu/phieu-ke-toan": "Phiếu kế toán",
  "/chung-tu/de-nghi-thanh-toan": "Đề nghị thanh toán",

  // Danh mục
  "/danh-muc/hop-dong": "Danh mục Hợp đồng",
  "/danh-muc/kho": "Danh mục Kho",

  // Thư viện
  "/quy-trinh": "Quy trình",
  "/chinh-sach": "Chính sách",
  "/bieu-mau": "Biểu mẫu",
  "/huong-dan": "Hướng dẫn",
};

const ComingSoon: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const title = pathTitles[location.pathname] || "Tính năng";

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <Result
        icon={
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <RocketOutlined className="text-6xl text-primary/30" />
            </div>
            <RocketOutlined className="text-6xl text-primary" />
          </div>
        }
        title={
          <span className="text-2xl font-bold text-foreground">
            {title}
          </span>
        }
        subTitle={
          <div className="space-y-2">
            <p className="text-muted-foreground text-base">
              Tính năng này đang được phát triển và sẽ sớm ra mắt!
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                Sắp ra mắt
              </span>
            </div>
          </div>
        }
        extra={
          <div className="flex gap-3 justify-center mt-4">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            >
              Quay lại
            </Button>
            <Button
              type="primary"
              icon={<HomeOutlined />}
              onClick={() => navigate("/")}
            >
              Về trang chủ
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default ComingSoon;
