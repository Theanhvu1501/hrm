import { Modal } from "antd";
import {
  useDonTuCuaToiHandler,
  useDonTuCuaToiState,
} from "../DonTuCuaToiHandlerContext";
import { LOAI_DON_OPTIONS } from "@/pages/cham-cong/don-cham-cong/constants";
import { MAT_HINH_LOAI } from "../loaiDonUI";
import { AttendanceRequestType } from "@/services/attendanceRequestService";
import "../don-tu.css";

/**
 * Bước 1 của việc nộp đơn: chọn loại đơn.
 *
 * Lưới ô icon kiểu app iOS (ô bo góc nền gradient + glyph trắng), chạm một ô là
 * mở thẳng form của đúng loại đó. Tách hẳn khỏi form để người dùng ra quyết
 * định "đơn gì" trước, gọn một màn, không phải nhìn cả tá ô nhập rồi mới thấy
 * chỗ chọn loại.
 */
export function ChonLoaiDon() {
  const handler = useDonTuCuaToiHandler();
  const [chonLoaiMo] = useDonTuCuaToiState("chonLoaiMo", false);

  return (
    <Modal
      open={!!chonLoaiMo}
      title="Chọn loại đơn"
      onCancel={() => handler.executeEvent("dongChonLoai", {})}
      centered
      destroyOnHidden
      footer={null}
      // Bo góc override tại chỗ (ConfigProvider ở App.tsx đặt borderRadius 0 cho
      // toàn dự án — xem chú thích ở FormNopDon).
      styles={{ content: { borderRadius: 16 } }}
    >
      <div className="grid grid-cols-2 gap-3 pt-1">
        {LOAI_DON_OPTIONS.map((o) => {
          const mh = MAT_HINH_LOAI[o.value as AttendanceRequestType];
          return (
            <button
              key={o.value}
              type="button"
              className="don-tu-the-loai"
              onClick={() =>
                handler.executeEvent("chonLoai", {
                  loaiDon: o.value as AttendanceRequestType,
                })
              }
            >
              <span className="don-tu-icon" style={{ background: mh.gradient }}>
                {mh.icon}
              </span>
              <span className="don-tu-the-nhan">{o.label}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
