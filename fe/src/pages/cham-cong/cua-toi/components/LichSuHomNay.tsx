import { Card, Empty, Tag } from "antd";
import { useChamCongCuaToiState } from "../ChamCongCuaToiHandlerContext";
import { TrangThaiHomNay } from "@/services/attendanceRecordService";
import { gioVN } from "@/ultils/thoiGianVN";
import "./NutCham.state";

export function LichSuHomNay() {
  const [homNay] = useChamCongCuaToiState(
    "homNay",
    null as TrangThaiHomNay | null
  );

  if (!homNay) return null;

  return (
    <Card title={`Hôm nay ${homNay.ngay}`} size="small">
      {homNay.banGhi.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có lượt chấm công nào"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {homNay.banGhi.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-1"
            >
              <div className="flex items-center gap-2">
                {b.loai === "vao" ? (
                  <Tag color="green">Vào</Tag>
                ) : (
                  <Tag color="blue">Ra</Tag>
                )}
                <span className="text-base font-medium">
                  {gioVN(b.thoiDiem)}
                </span>
                <span className="text-xs text-gray-500">{b.locationTen}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {/* Vàng, không đỏ: bản ghi vẫn hợp lệ, chỉ chờ HR xem xét. */}
                {b.ngoaiVung && <Tag color="gold">Ngoài vùng</Tag>}
                {b.loai === "vao" && b.soPhutDiMuon > 0 && (
                  <Tag color="orange">Muộn {b.soPhutDiMuon}′</Tag>
                )}
                {b.loai === "ra" && b.soPhutVeSom > 0 && (
                  <Tag color="orange">Sớm {b.soPhutVeSom}′</Tag>
                )}
                {b.nguonTao === "hr_nhap" && <Tag>HR nhập</Tag>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
