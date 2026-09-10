import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Result } from "antd";
import {
  RocketOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { labelByPath } from "@/config/menuCatalog";

// Trang không nằm trên sidebar (vỏ nhân viên /toi) — thiếu ở đây thì hiện
// tiêu đề chung "Tính năng".
const TIEU_DE_NGOAI_MENU: Record<string, string> = {
  "/toi/don-tu": "Đơn từ",
  "/toi/bang-cong": "Bảng công",
};

const ComingSoon: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const title =
    labelByPath(location.pathname) ?? TIEU_DE_NGOAI_MENU[location.pathname] ?? "Tính năng";

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
