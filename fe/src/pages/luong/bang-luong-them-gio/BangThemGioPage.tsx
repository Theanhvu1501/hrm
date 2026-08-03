import { useEffect } from "react";
import { Button, Card, Empty } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  BangThemGioHandlerProvider,
  useBangThemGioHandler,
  useBangThemGioState,
} from "./BangThemGioHandlerContext";
import { ThanhKyThemGio } from "./components/ThanhKyThemGio";
import { BangThemGioTable } from "./components/BangThemGioTable";
import { usePagePermission } from "@/hooks/usePagePermission";
import type { DongLuongThemGio } from "@/services/bangLuongThemGioService";
import "./BangThemGioPage.state";

function BangThemGioPageInner() {
  const handler = useBangThemGioHandler();
  const [danhSach] = useBangThemGioState("danhSach", [] as DongLuongThemGio[]);
  const [dangTai] = useBangThemGioState("dangTai", false);
  const [dangTongHop] = useBangThemGioState("dangTongHop", false);
  const [thang] = useBangThemGioState("thang", dayjs().format("YYYY-MM"));
  const { canEdit } = usePagePermission("/luong/bang-luong");

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  const xuat = () => {
    // Task 6 nối hàm dựng biểu mẫu vào đây.
  };

  return (
    <div className="space-y-3">
      <ThanhKyThemGio onXuat={xuat} />
      {!dangTai && danhSach.length === 0 ? (
        <Card>
          <Empty description="Chưa có dữ liệu bảng lương thêm giờ tháng này">
            {canEdit && (
              <Button
                type="primary"
                size="large"
                icon={<SyncOutlined />}
                loading={dangTongHop}
                onClick={() => handler.executeEvent("tongHop", { thang })}
              >
                Tổng hợp
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <BangThemGioTable />
      )}
    </div>
  );
}

const BangThemGioPage: React.FC = () => (
  <BangThemGioHandlerProvider>
    <BangThemGioPageInner />
  </BangThemGioHandlerProvider>
);

export default BangThemGioPage;
