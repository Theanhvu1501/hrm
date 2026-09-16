import { useState } from "react";
import { Alert, Button, Input, message } from "antd";
import { CheckOutlined, EditOutlined } from "@ant-design/icons";
import { timesheetService, type Timesheet } from "@/services/timesheetService";
import { thongDiepLoiDon } from "@/pages/toi/don-tu/thongDiepLoi";

interface Props {
  bangCong: Timesheet | null;
  /** Hôm nay "YYYY-MM-DD" theo giờ VN — truyền vào để test được, không tự đọc đồng hồ. */
  homNay: string;
  onXong: () => void;
}

/** Ngày "YYYY-MM-DD" → "DD/MM/YYYY". */
function ngayVN(iso?: string): string {
  if (!iso) return "";
  const [n, t, ng] = iso.split("-");
  return `${ng}/${t}/${n}`;
}

/**
 * Khối "xác nhận bảng công" trong vỏ nhân viên (yêu cầu d19).
 *
 * Quy tắc hạn giống hệt BE (`xac-nhan-bang-cong.ts`): hết NGÀY hạn vẫn còn
 * phản hồi được, hôm sau thì hết. Kiểm ở đây chỉ để không hiện nút vô ích —
 * BE mới là chốt chặn thật.
 */
export function XacNhanBangCong({ bangCong, homNay, onXong }: Props) {
  const [moDeNghi, setMoDeNghi] = useState(false);
  const [yKien, setYKien] = useState("");
  const [dangGui, setDangGui] = useState(false);

  if (!bangCong) return null;

  const tt = bangCong.trangThaiXacNhan ?? "chua_gui";
  if (tt === "chua_gui") return null;

  const quaHan = !!bangCong.hanXacNhan && homNay > bangCong.hanXacNhan;
  const conPhanHoi = tt === "cho_xac_nhan" && !quaHan;

  const gui = async (dongY: boolean) => {
    if (!dongY && !yKien.trim()) {
      message.error("Nêu rõ nội dung cần điều chỉnh");
      return;
    }
    setDangGui(true);
    try {
      await timesheetService.phanHoi(bangCong._id, dongY, yKien.trim());
      message.success(
        dongY ? "Đã xác nhận bảng công" : "Đã gửi đề nghị điều chỉnh",
      );
      setMoDeNghi(false);
      setYKien("");
      onXong();
    } catch (err) {
      message.error(thongDiepLoiDon(err, "Không gửi được phản hồi."));
    } finally {
      setDangGui(false);
    }
  };

  if (tt === "da_xac_nhan") {
    return (
      <Alert
        className="mb-4"
        type="success"
        showIcon
        message="Bạn đã xác nhận bảng công tháng này"
        description={`Xác nhận ngày ${ngayVN(bangCong.ngayXacNhan)}.`}
      />
    );
  }

  if (tt === "de_nghi_dieu_chinh") {
    return (
      <Alert
        className="mb-4"
        type="warning"
        showIcon
        message="Đã gửi đề nghị điều chỉnh"
        description={`Nội dung: ${bangCong.yKienNhanVien ?? "-"}. C&B sẽ kiểm tra và gửi lại bảng công sau khi sửa.`}
      />
    );
  }

  if (quaHan) {
    return (
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="Đã quá hạn xác nhận"
        description={`Hạn phản hồi là ${ngayVN(bangCong.hanXacNhan)} — bảng công đã khoá. Cần sửa thì liên hệ C&B.`}
      />
    );
  }

  return (
    <div className="emp-card mb-4 p-3">
      <div className="text-[15px] font-semibold">Xác nhận bảng công</div>
      <div className="mt-1 text-[13px] text-[color:var(--emp-text-phu)]">
        Kiểm tra lịch bên dưới. Hạn phản hồi:{" "}
        <b>{ngayVN(bangCong.hanXacNhan)}</b> — quá hạn thì bảng coi như đã được
        bạn chấp nhận.
      </div>

      {!moDeNghi ? (
        <div className="mt-3 flex gap-2">
          <Button
            type="primary"
            size="large"
            icon={<CheckOutlined />}
            loading={dangGui}
            disabled={!conPhanHoi}
            onClick={() => gui(true)}
          >
            Đúng rồi
          </Button>
          <Button
            size="large"
            icon={<EditOutlined />}
            disabled={!conPhanHoi}
            onClick={() => setMoDeNghi(true)}
          >
            Đề nghị điều chỉnh
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <Input.TextArea
            rows={3}
            maxLength={2000}
            value={yKien}
            placeholder="Ngày nào sai và sai thế nào? VD: ngày 12/9 tôi có đi làm nhưng bảng ghi nghỉ."
            onChange={(e) => setYKien(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <Button
              type="primary"
              size="large"
              loading={dangGui}
              onClick={() => gui(false)}
            >
              Gửi đề nghị
            </Button>
            <Button size="large" onClick={() => setMoDeNghi(false)}>
              Huỷ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
