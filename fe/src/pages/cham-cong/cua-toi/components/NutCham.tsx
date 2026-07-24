import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Input, Space, Typography } from "antd";
import {
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  useChamCongCuaToiHandler,
  useChamCongCuaToiState,
} from "../ChamCongCuaToiHandlerContext";
import {
  CHAN_CHAM_CONG,
  choPhepGuiHrDuyet,
  THONG_DIEP,
  TrangThai,
} from "../trangThai";
import { DAI_NHAT_TEN_THIET_BI, tenThietBiMacDinh } from "../tenThietBi";
import {
  AttendanceRecord,
  TrangThaiHomNay,
} from "@/services/attendanceRecordService";
import { KetQuaChamCongDialog } from "./KetQuaChamCongDialog";
import "./NutCham.state";

const { Text } = Typography;

/**
 * Trạng thái chặn nào đọc như "chờ một chút" (vàng) và trạng thái nào là
 * "hỏng, phải nhờ HR" (đỏ). Phân biệt bằng màu để người dùng biết ngay có
 * cần làm gì không, trước cả khi đọc hết câu.
 */
const CHAN_MAU_VANG: ReadonlySet<TrangThai> = new Set<TrangThai>([
  TrangThai.THIET_BI_CHO_DUYET,
  TrangThai.THIET_BI_CHUA_DUOC_PHEP,
  TrangThai.THIET_BI_THIEU_DINH_DANH,
]);

/** Lỗi tạm thời hiện ngay trên màn hình chính, nút chấm vẫn còn để thử lại. */
const LOI_TAM_THOI: ReadonlySet<TrangThai> = new Set<TrangThai>([
  TrangThai.TU_CHOI_VI_TRI,
  TrangThai.LOI_VI_TRI,
  TrangThai.LOI_KHAC,
  // Đứng ngoài bán kính là lỗi tạm thời (đi lại gần là hết): câu backend nêu
  // khoảng cách thật (vd "cách 480m") nên phải hiện ra, không được im lặng
  // trong khi nút vẫn còn cho bấm lại.
  TrangThai.NGOAI_BAN_KINH,
]);

/**
 * Cao 64px, bo tròn hết cỡ (xem `borderRadius: 999` bên dưới). 64px vẫn là
 * đích ngón cái thoải mái trên điện thoại (chuẩn touch-target ~44-48px của
 * iOS/Android còn dư biên) — không cần tới 96px như trước mới bấm được mà
 * không cần nhìn.
 */
const CAO_NUT_CHAM = 64;

export function NutCham() {
  const handler = useChamCongCuaToiHandler();
  const [homNay] = useChamCongCuaToiState(
    "homNay",
    null as TrangThaiHomNay | null
  );
  const [trangThai] = useChamCongCuaToiState("trangThai", TrangThai.DANG_TAI);
  const [dangCham] = useChamCongCuaToiState("dangCham", false);
  const [banGhiVuaTao] = useChamCongCuaToiState(
    "banGhiVuaTao",
    null as AttendanceRecord | null
  );
  const [thongBao] = useChamCongCuaToiState("thongBao", "");
  // Điền sẵn tên suy từ trình duyệt để người đang vội chỉ cần bấm gửi; ai
  // muốn tên dễ nhận hơn thì sửa lại.
  const [tenThietBi, setTenThietBi] = useState(() => tenThietBiMacDinh());

  // Dialog kết quả chỉ mở khi RÌA XUỐNG của `dangCham` (true → false) rơi
  // đúng vào một trong ba kết quả biết trước (thành công/ngoài vùng, lỗi tạm
  // thời, sai thứ tự). Không mở lúc mount (dangCham khởi tạo là false, không
  // có rìa xuống nào để bắt) và không tự mở lại khi trạng thái đổi vì lý do
  // khác cú bấm (vd nạp lại lịch tuần).
  const [dialogMo, setDialogMo] = useState(false);
  const dangChamTruocRef = useRef(dangCham);
  useEffect(() => {
    const laKetQuaChamCong =
      !!banGhiVuaTao ||
      LOI_TAM_THOI.has(trangThai) ||
      trangThai === TrangThai.SAI_THU_TU;
    if (dangChamTruocRef.current && !dangCham && laKetQuaChamCong) {
      setDialogMo(true);
    }
    dangChamTruocRef.current = dangCham;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dangCham]);

  const cau = thongBao || THONG_DIEP[trangThai];

  // ── 1. Đang tải ────────────────────────────────────────────────────────
  // Spinner iOS mượt, KHÔNG kèm chữ (aria-label cho trình đọc màn hình thôi).
  if (trangThai === TrangThai.DANG_TAI) {
    return (
      <div className="flex justify-center py-16">
        <span className="emp-spinner emp-spinner-lon" role="status" aria-label="Đang tải" />
      </div>
    );
  }

  // ── 2. Nhóm chặn: không hiện nút chấm, chỉ hiện lối ra ──────────────────
  if (CHAN_CHAM_CONG.has(trangThai)) {
    return (
      <Card>
        <Alert
          type={CHAN_MAU_VANG.has(trangThai) ? "warning" : "error"}
          message="Chưa thể chấm công"
          description={cau}
          showIcon
        />

        {choPhepGuiHrDuyet(trangThai) && (
          <div className="mt-4">
            <Text type="secondary" className="text-xs">
              Đặt tên cho máy này để HR nhận ra bạn trong hàng chờ duyệt:
            </Text>
            <Input
              className="mt-2"
              size="large"
              maxLength={DAI_NHAT_TEN_THIET_BI}
              placeholder="Ví dụ: iPhone của Hải"
              value={tenThietBi}
              onChange={(e) => setTenThietBi(e.target.value)}
            />
            <Button
              className="mt-2"
              block
              size="large"
              type="primary"
              loading={dangCham}
              onClick={() => handler.executeEvent("cham", { tenThietBi })}
            >
              Gửi HR duyệt máy này
            </Button>
          </div>
        )}

        <Button
          className="mt-2"
          block
          size="large"
          icon={<ReloadOutlined />}
          loading={dangCham}
          onClick={() => handler.executeEvent("init", {})}
        >
          Kiểm tra lại
        </Button>
      </Card>
    );
  }

  // ── 3. Không có dữ liệu hôm nay (mất mạng lúc mở màn hình) ──────────────
  // Không rơi xuống nhánh dưới: thiếu homNay thì không biết nên hiện nút VÀO
  // hay RA, mà đoán sai chiều là đẩy thẳng người dùng vào lỗi 409.
  if (!homNay) {
    return (
      <Card>
        <Alert type="error" showIcon message="Không tải được dữ liệu chấm công" description={cau} />
        <Button
          className="mt-4"
          block
          size="large"
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => handler.executeEvent("init", {})}
        >
          Thử lại
        </Button>
      </Card>
    );
  }

  // ── 4. Màn hình chính ──────────────────────────────────────────────────
  const laVao = homNay.hanhDongKeTiep === "vao";

  return (
    <div>
      {/*
        Kết quả của lượt bấm gần nhất (thành công/ngoài vùng, lỗi tạm thời,
        sai thứ tự vào/ra) giờ dồn về MỘT dialog thay vì 3 Alert nội dòng —
        `dialogMo` chỉ bật ở rìa xuống của `dangCham` (xem effect phía trên),
        nên dialog luôn kể đúng chuyện của cú bấm vừa rồi, không phải dữ liệu
        cũ còn sót từ lượt trước.
      */}
      <KetQuaChamCongDialog
        open={dialogMo}
        onClose={() => setDialogMo(false)}
        banGhiVuaTao={banGhiVuaTao}
        laSaiThuTu={trangThai === TrangThai.SAI_THU_TU}
        cau={cau}
      />

      <Space direction="vertical" size="middle" className="w-full">
        <Button
          type="primary"
          size="large"
          block
          loading={dangCham}
          // Lúc bấm đang gửi: ẩn icon để chỉ còn MỘT spinner sạch giữa nút
          // (không icon + spinner cạnh nhau). Bình thường mới hiện icon vào/ra.
          icon={dangCham ? undefined : laVao ? <LoginOutlined /> : <LogoutOutlined />}
          // Teal cho VÀO, cam cho RA. Cố ý KHÔNG dùng `danger` (đỏ antd):
          // trên màn hình này đỏ đã có nghĩa "hỏng", dùng lại cho nút chính
          // sẽ khiến người dùng ngần ngại bấm.
          style={{
            height: CAO_NUT_CHAM,
            fontSize: 18,
            fontWeight: 700,
            // Bo góc do `.emp-shell .ant-btn` lo (12px — index.css ép 0
            // !important nên đặt borderRadius inline ở đây vô ích).
            // Teal (tint iOS) cho VÀO, cam hệ thống iOS (#ff9500) cho RA.
            backgroundColor: dangCham ? undefined : laVao ? "#12a594" : "#ff9500",
            borderColor: dangCham ? undefined : laVao ? "#12a594" : "#ff9500",
            touchAction: "manipulation",
          }}
          onClick={() => handler.executeEvent("cham", {})}
        >
          {/*
            Nhãn "Chấm công" chỉ hiện khi KHÔNG gửi. Lúc gửi để trống → nút chỉ
            còn spinner, không kèm chữ (đúng yêu cầu loading không text). Ba ô
            trạng thái ngay trên đã nói rõ thiếu vào hay ra nên nút không cần
            chữ VÀO/RA.
          */}
          {dangCham ? "" : "Chấm công"}
        </Button>
      </Space>
    </div>
  );
}
