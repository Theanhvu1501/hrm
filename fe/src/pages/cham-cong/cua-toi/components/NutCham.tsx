import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Input, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { Hero } from "./Hero";
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

      {/*
        Hero: đồng hồ sống + thông tin ca/địa điểm + tiến trình ca + nút chấm
        pill. Nút teal cho VÀO, cam cho RA (KHÔNG dùng đỏ antd — đỏ trên màn
        này nghĩa là "hỏng"). Mọi máy trạng thái (tải/chặn/lỗi) vẫn ở NutCham,
        Hero chỉ là màn hình chính khi đã sẵn sàng chấm.
      */}
      {/*
        Ngày làm online: nói TRƯỚC khi người ta bấm. Không có băng này thì
        người đang ở nhà phải tự đoán xem mình có chấm được không, và cách
        duy nhất để biết là bấm thử.
      */}
      {homNay.laOnline && (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          message="Hôm nay bạn làm online"
          description="Cứ bấm chấm công ở bất kỳ đâu — hôm nay hệ thống không kiểm tra vị trí. Giờ vào/ra vẫn tính như ngày thường."
        />
      )}

      <Hero
        homNay={homNay}
        laVao={laVao}
        dangCham={dangCham}
        onCham={() => handler.executeEvent("cham", {})}
      />
    </div>
  );
}
