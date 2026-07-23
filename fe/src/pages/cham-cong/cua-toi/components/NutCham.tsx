import { useState } from "react";
import { Alert, Button, Card, Input, Space, Spin, Typography } from "antd";
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
import { gioVN } from "@/ultils/thoiGianVN";
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

/** Cao 96px: ngón cái bấm được mà không cần nhìn, kể cả khi đang vội. */
const CAO_NUT_CHAM = 96;

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

  const cau = thongBao || THONG_DIEP[trangThai];

  // ── 1. Đang tải ────────────────────────────────────────────────────────
  if (trangThai === TrangThai.DANG_TAI) {
    return (
      <div className="flex justify-center py-16">
        <Spin tip="Đang tải trạng thái chấm công…">
          <div className="h-8 w-8" />
        </Spin>
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
  // Đủ công = ngày công có cả lượt vào lẫn lượt ra. Nút VẪN bấm được: bấm
  // thêm là cập nhật giờ ra, lối thoát cho người lỡ bấm ra sớm.
  const daDuCong =
    homNay.banGhi.some((b) => b.loai === "vao") &&
    homNay.banGhi.some((b) => b.loai === "ra");

  return (
    <div>
      <Space direction="vertical" size="middle" className="w-full">
        {/*
          Ngoài vùng KHÔNG phải lỗi: bản ghi đã vào sổ, chỉ là đứng ngoài khu
          vực cho phép và HR sẽ xem xét. Hiện đỏ như lỗi thì người dùng bấm
          lại nhiều lần và đẻ ra rác — nên vàng, kèm câu "không cần chấm lại".
        */}
        {banGhiVuaTao && (
          <Alert
            type={banGhiVuaTao.ngoaiVung ? "warning" : "success"}
            showIcon
            message={
              banGhiVuaTao.ngoaiVung
                ? "Đã ghi nhận — ngoài khu vực cho phép"
                : `Đã chấm công ${banGhiVuaTao.loai === "vao" ? "vào" : "ra"} thành công`
            }
            description={
              banGhiVuaTao.ngoaiVung
                ? `Ghi lúc ${gioVN(banGhiVuaTao.thoiDiem)}${
                    banGhiVuaTao.khoangCachMet !== undefined
                      ? `, cách điểm chấm công gần nhất khoảng ${Math.round(banGhiVuaTao.khoangCachMet)}m`
                      : ""
                  }. Bạn đang ở ngoài khu vực cho phép, HR sẽ xem xét. Không cần chấm lại.`
                : `Ghi lúc ${gioVN(banGhiVuaTao.thoiDiem)}${
                    banGhiVuaTao.locationTen ? ` tại ${banGhiVuaTao.locationTen}` : ""
                  }.`
            }
          />
        )}

        {LOI_TAM_THOI.has(trangThai) && (
          <Alert type="error" showIcon message="Chưa chấm công được" description={cau} />
        )}

        {/*
          Sai thứ tự vào/ra là hiểu nhầm chứ không phải hỏng — vàng, và hiện
          nguyên văn câu backend vì chỉ backend biết ngày nào đang treo.
        */}
        {trangThai === TrangThai.SAI_THU_TU && (
          <Alert type="warning" showIcon message="Sai thứ tự vào/ra" description={cau} />
        )}

        <Button
          type="primary"
          size="large"
          block
          loading={dangCham}
          icon={laVao ? <LoginOutlined /> : <LogoutOutlined />}
          // Teal cho VÀO, cam cho RA. Cố ý KHÔNG dùng `danger` (đỏ antd):
          // trên màn hình này đỏ đã có nghĩa "hỏng", dùng lại cho nút chính
          // sẽ khiến người dùng ngần ngại bấm.
          style={{
            height: CAO_NUT_CHAM,
            fontSize: 22,
            fontWeight: 700,
            borderRadius: 12,
            backgroundColor: dangCham ? undefined : laVao ? "#1f7769" : "#ea580c",
            borderColor: dangCham ? undefined : laVao ? "#1f7769" : "#ea580c",
            touchAction: "manipulation",
          }}
          onClick={() => handler.executeEvent("cham", {})}
        >
          {/*
            Nhãn luôn là "Chấm công" (theo mockup) — ba ô trạng thái ngay
            trên đã nói rõ đang thiếu vào hay thiếu ra, chữ VÀO/RA trên nút
            là thừa. Màu + icon (teal/vào, cam/ra) vẫn giữ nguyên để chỉ
            ngầm việc sắp ghi mà không cần chữ.
          */}
          Chấm công
        </Button>

        {daDuCong && (
          <div className="text-center">
            <Text type="secondary" className="text-xs">
              Đã đủ công — bấm lại nếu cần cập nhật giờ ra
            </Text>
          </div>
        )}

        <div className="text-center">
          <Text type="secondary" className="text-xs">
            Thời gian ghi nhận lấy từ máy chủ, không lấy từ đồng hồ điện thoại.
          </Text>
        </div>
      </Space>
    </div>
  );
}
