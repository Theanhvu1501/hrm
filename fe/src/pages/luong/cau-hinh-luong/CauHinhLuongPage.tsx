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
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cấu hình lương</h1>
          <p className="text-muted-foreground">
            Khoản lương, bậc thuế TNCN và các hằng số dùng khi tính bảng lương
          </p>
        </div>
        {canEdit && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={dangLuu}
            disabled={!cauHinh}
            onClick={handleLuu}
          >
            Lưu cấu hình
          </Button>
        )}
      </div>

      <Spin spinning={dangTai}>
        {cauHinh ? (
          <Card>
            <Tabs
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
              ]}
            />
          </Card>
        ) : (
          !dangTai && (
            <Card>
              <Empty description="Không thể tải cấu hình lương" />
            </Card>
          )
        )}
      </Spin>
    </div>
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
