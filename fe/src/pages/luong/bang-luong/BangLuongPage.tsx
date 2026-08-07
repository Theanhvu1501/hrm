import { useEffect, useState } from "react";
import { Button, Card, Empty } from "antd";
import { SyncOutlined, ImportOutlined } from "@ant-design/icons";
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
import type { KhoanLuong } from "@/services/cauHinhLuongService";
import { ImportNhapTheoKyModal } from "./components/ImportNhapTheoKyModal";
import "./BangLuongPage.state";

function BangLuongPageInner() {
  const handler = useBangLuongHandler();
  const [danhSach] = useBangLuongState("danhSach", [] as DongLuong[]);
  const [dangTai] = useBangLuongState("dangTai", false);
  const [dangTongHop] = useBangLuongState("dangTongHop", false);
  const [thang] = useBangLuongState("thang", dayjs().format("YYYY-MM"));
  const [khoanLuong] = useBangLuongState("khoanLuong", [] as KhoanLuong[]);
  const { canEdit } = usePagePermission("/luong/bang-luong");
  const [moImport, setMoImport] = useState(false);

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  const handleTongHop = () => {
    handler.executeEvent("tongHop", { thang });
  };

  return (
    <div className="space-y-3">
      <ThanhKy />
      {/* Chỉ hiện khi ĐÃ có bảng lương: import vào một kỳ chưa tổng hợp thì
          mọi dòng đều báo "không có dòng lương trong kỳ" — mời người dùng làm
          một việc chắc chắn hỏng. */}
      {canEdit && danhSach.length > 0 && (
        <div className="flex justify-end">
          <Button icon={<ImportOutlined />} onClick={() => setMoImport(true)}>
            Import hiệu suất / thưởng
          </Button>
        </div>
      )}
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

      <ImportNhapTheoKyModal
        open={moImport}
        thang={thang}
        danhSach={danhSach}
        khoanLuong={khoanLuong}
        onClose={() => setMoImport(false)}
        onXong={() => handler.executeEvent("doiThang", { thang })}
      />
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
