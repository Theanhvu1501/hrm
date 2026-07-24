import { useEffect } from "react";
import { Button, Card, Empty } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  BangLuongHandlerProvider,
  useBangLuongHandler,
  useBangLuongState,
} from "./BangLuongHandlerContext";
import { ThanhKy } from "./components/ThanhKy";
import { BangLuongTable } from "./components/BangLuongTable";
import { usePagePermission } from "@/hooks/usePagePermission";
import type { DongLuong } from "@/services/bangLuongService";
import "./BangLuongPage.state";

function BangLuongPageInner() {
  const handler = useBangLuongHandler();
  const [danhSach] = useBangLuongState("danhSach", [] as DongLuong[]);
  const [dangTai] = useBangLuongState("dangTai", false);
  const [dangTongHop] = useBangLuongState("dangTongHop", false);
  const [thang] = useBangLuongState("thang", dayjs().format("YYYY-MM"));
  const { canEdit } = usePagePermission("/luong/bang-luong");

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  const handleTongHop = () => {
    handler.executeEvent("tongHop", { thang });
  };

  return (
    <div className="space-y-3">
      <ThanhKy />
      {!dangTai && danhSach.length === 0 ? (
        <Card>
          <Empty description="Chưa tổng hợp bảng lương tháng này">
            {canEdit && (
              <Button
                type="primary"
                size="large"
                icon={<SyncOutlined />}
                loading={dangTongHop}
                onClick={handleTongHop}
              >
                Tổng hợp
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <BangLuongTable />
      )}
    </div>
  );
}

const BangLuongPage: React.FC = () => {
  return (
    <BangLuongHandlerProvider>
      <BangLuongPageInner />
    </BangLuongHandlerProvider>
  );
};

export default BangLuongPage;
