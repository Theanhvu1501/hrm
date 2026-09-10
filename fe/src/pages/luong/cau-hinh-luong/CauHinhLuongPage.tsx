import { useEffect } from "react";
import { Button, Card, Spin, Tabs, Empty } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import {
  CauHinhLuongHandlerProvider,
  useCauHinhLuongHandler,
  useCauHinhLuongState,
} from "./CauHinhLuongHandlerContext";
import { KhoanLuongEditor } from "./components/KhoanLuongEditor";
import { BacThueEditor } from "./components/BacThueEditor";
import { HangSoEditor } from "./components/HangSoEditor";
import { LamThemEditor } from "./components/LamThemEditor";
import { usePagePermission } from "@/hooks/usePagePermission";
import type { CauHinhLuong } from "@/services/cauHinhLuongService";
import "./CauHinhLuongPage.state";

function CauHinhLuongPageInner() {
  const handler = useCauHinhLuongHandler();
  const [cauHinh] = useCauHinhLuongState("cauHinh", null as CauHinhLuong | null);
  const [dangTai] = useCauHinhLuongState("dangTai", false);
  const [dangLuu] = useCauHinhLuongState("dangLuu", false);
  const { canEdit } = usePagePermission("/luong/cau-hinh");

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  const handleLuu = () => {
    if (!cauHinh) return;
    handler.executeEvent("luu", { cauHinh });
  };

  return (
    <Spin spinning={dangTai}>
      {cauHinh ? (
        <Card>
          <Tabs
            // Nút Lưu nằm trên hàng tab: một nút lưu CẢ bốn tab, nên đặt ngoài
            // nội dung từng tab để không ai tưởng chỉ lưu tab đang mở.
            tabBarExtraContent={
              canEdit && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={dangLuu}
                  onClick={handleLuu}
                >
                  Lưu cấu hình
                </Button>
              )
            }
            items={[
              {
                key: "khoan-luong",
                label: "Khoản lương",
                children: <KhoanLuongEditor canEdit={canEdit} />,
              },
              {
                key: "bac-thue",
                label: "Bậc thuế",
                children: <BacThueEditor canEdit={canEdit} />,
              },
              {
                key: "hang-so",
                label: "Hằng số",
                children: <HangSoEditor canEdit={canEdit} />,
              },
              {
                key: "lam-them",
                label: "Làm thêm & quỹ giờ",
                children: <LamThemEditor canEdit={canEdit} />,
              },
            ]}
          />
        </Card>
      ) : (
        <Card>
          {/* Lần tải đầu chưa có gì để hiện: giữ một khoảng trống cho Spin
              đứng giữa, thay vì báo "không tải được" trong lúc đang tải. */}
          {dangTai ? (
            <div className="h-40" />
          ) : (
            <Empty description="Không thể tải cấu hình lương" />
          )}
        </Card>
      )}
    </Spin>
  );
}

const CauHinhLuongPage: React.FC = () => {
  return (
    <CauHinhLuongHandlerProvider>
      <CauHinhLuongPageInner />
    </CauHinhLuongHandlerProvider>
  );
};

export default CauHinhLuongPage;
