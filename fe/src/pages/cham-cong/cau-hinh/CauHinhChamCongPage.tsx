import { useEffect } from "react";
import { Alert, Button, Card, Checkbox, Empty, Spin } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import {
  CauHinhChamCongHandlerProvider,
  useCauHinhChamCongHandler,
  useCauHinhChamCongState,
} from "./CauHinhChamCongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import type { CauHinhChamCong } from "@/services/cauHinhChamCongService";
import "./CauHinhChamCongPage.state";

const NGAY_TRONG_TUAN_OPTIONS = [
  { label: "Thứ 2", value: 1 },
  { label: "Thứ 3", value: 2 },
  { label: "Thứ 4", value: 3 },
  { label: "Thứ 5", value: 4 },
  { label: "Thứ 6", value: 5 },
  { label: "Thứ 7", value: 6 },
  { label: "Chủ nhật", value: 0 },
];

function CauHinhChamCongPageInner() {
  const handler = useCauHinhChamCongHandler();
  // Setter lấy từ chính hook (cùng cách `HangSoEditor.tsx` đang làm) —
  // KHÔNG gọi `handler.setState(...)` trực tiếp từ component.
  const [cauHinh, setCauHinh] = useCauHinhChamCongState(
    "cauHinh",
    null as CauHinhChamCong | null
  );
  const [dangTai] = useCauHinhChamCongState("dangTai", false);
  const [dangLuu] = useCauHinhChamCongState("dangLuu", false);
  const { canEdit } = usePagePermission("/cham-cong/cau-hinh");

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  const handleLuu = () => {
    if (!cauHinh) return;
    handler.executeEvent("luu", { cauHinh });
  };

  const handleDoiLich = (value: number[]) => {
    if (!cauHinh) return;
    setCauHinh({ ...cauHinh, ngayLamViecTrongTuan: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cấu hình chấm công</h1>
          <p className="text-muted-foreground">
            Lịch làm việc trong tuần áp dụng cho toàn công ty
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
            <label className="block mb-2 text-sm font-medium">
              Ngày làm việc trong tuần
            </label>
            <Checkbox.Group
              options={NGAY_TRONG_TUAN_OPTIONS}
              value={cauHinh.ngayLamViecTrongTuan ?? []}
              onChange={(v) => handleDoiLich(v as number[])}
              disabled={!canEdit}
            />
            <div className="mt-3 text-xs text-gray-500">
              Ngày không tích sẽ để trống trên bảng công (không tính công, không
              chặn chốt), và không tính vào số ngày làm việc chuẩn của tháng khi
              xét ngưỡng tích phép năm. Nhân viên có lịch khác thì khai riêng ở
              hồ sơ — khai riêng luôn thắng lịch chung.
            </div>
            {(cauHinh.ngayLamViecTrongTuan ?? []).length === 0 && (
              <Alert
                type="warning"
                showIcon
                className="mt-3"
                message="Chưa tích ngày nào"
                description="Bỏ trống hoàn toàn nghĩa là chưa cấu hình: hệ thống sẽ coi MỌI ngày đều là ngày làm việc, kể cả T7 và Chủ nhật. Đó thường không phải điều bạn muốn."
              />
            )}
          </Card>
        ) : (
          !dangTai && (
            <Card>
              <Empty description="Không thể tải cấu hình chấm công" />
            </Card>
          )
        )}
      </Spin>
    </div>
  );
}

const CauHinhChamCongPage: React.FC = () => {
  return (
    <CauHinhChamCongHandlerProvider>
      <CauHinhChamCongPageInner />
    </CauHinhChamCongHandlerProvider>
  );
};

export default CauHinhChamCongPage;
