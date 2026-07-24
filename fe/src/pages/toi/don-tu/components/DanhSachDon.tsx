import { Alert, Button, Popconfirm, Spin, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  useDonTuCuaToiHandler,
  useDonTuCuaToiState,
} from "../DonTuCuaToiHandlerContext";
import { AttendanceRequest } from "@/services/attendanceRequestService";
import {
  LOAI_DON_OPTIONS,
  TRANG_THAI_OPTIONS,
  TRANG_THAI_TAG_COLOR,
  labelFor,
} from "@/pages/cham-cong/don-cham-cong/constants";
import { dongPhu, khoangNgay } from "../moTaDon";
import "./DanhSachDon.state";

/**
 * Danh sách đơn của chính mình.
 *
 * Ba trạng thái rỗng KHÁC NHAU và không được trộn: đang tải, lỗi tải, và
 * thật sự chưa có đơn nào. Trước P3.1 lỗi tải chỉ `console.error` nên hai
 * cái sau trông y hệt nhau — người dùng nhìn thấy "chưa có đơn nào" rồi nộp
 * lại đúng cái đơn họ vừa nộp hôm qua.
 */
export function DanhSachDon() {
  const handler = useDonTuCuaToiHandler();
  const [danhSach] = useDonTuCuaToiState("danhSach", [] as AttendanceRequest[]);
  const [dangTai] = useDonTuCuaToiState("dangTai", false);
  const [loiTai] = useDonTuCuaToiState("loiTai", "");
  const [loiHuy] = useDonTuCuaToiState("loiHuy", "");
  const [dangHuyId] = useDonTuCuaToiState("dangHuyId", null as string | null);

  if (dangTai) {
    return (
      <div className="flex justify-center py-16">
        <Spin tip="Đang tải đơn của bạn…">
          <div className="h-8 w-8" />
        </Spin>
      </div>
    );
  }

  if (loiTai) {
    return (
      <div className="emp-card p-4">
        <Alert
          type="error"
          showIcon
          message="Không tải được danh sách đơn"
          description={loiTai}
        />
        <Button
          className="mt-3"
          block
          size="large"
          icon={<ReloadOutlined />}
          style={{ borderRadius: 999 }}
          onClick={() => handler.executeEvent("init", {})}
        >
          Thử lại
        </Button>
      </div>
    );
  }

  const ds = danhSach ?? [];

  return (
    <div>
      {/* Lỗi huỷ nằm TRÊN danh sách chứ không nằm trong từng thẻ đơn: sau khi
          huỷ hỏng, danh sách được nạp lại và thẻ đơn có thể đã đổi chỗ. */}
      {loiHuy && (
        <Alert
          className="mb-3"
          type="error"
          showIcon
          message={loiHuy}
          style={{ borderRadius: 12 }}
        />
      )}

      {ds.length === 0 ? (
        <div className="emp-card px-4 py-10 text-center">
          <div className="text-[15px] font-semibold">Chưa có đơn nào</div>
          <div className="mt-1 text-[13px] text-[color:var(--emp-muted)]">
            Bấm “Nộp đơn” để xin nghỉ phép, giải trình hoặc đăng ký làm thêm giờ.
          </div>
        </div>
      ) : (
        ds.map((don) => (
          <TheDon
            key={don.id}
            don={don}
            dangHuy={dangHuyId === don.id}
            onHuy={() => handler.executeEvent("huyDon", { id: don.id })}
          />
        ))
      )}
    </div>
  );
}

function TheDon({
  don,
  dangHuy,
  onHuy,
}: {
  don: AttendanceRequest;
  dangHuy: boolean;
  onHuy: () => void;
}) {
  // CHỈ đơn còn chờ duyệt mới huỷ được. Đơn đã duyệt/từ chối là một quyết
  // định đã có hiệu lực — backend cũng chặn (DON_DA_XU_LY_KHONG_THE_HUY), nên
  // hiện nút ở đây chỉ để dẫn người dùng vào một lỗi biết trước.
  const huyDuoc = don.trangThai === "cho_duyet";
  const phu = dongPhu(don);

  return (
    <div className="emp-card mb-3 p-4" data-testid="the-don">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">
            {labelFor(LOAI_DON_OPTIONS, don.loaiDon)}
          </div>
          <div className="mt-0.5 text-[13px] text-[color:var(--emp-text-phu)]">
            {khoangNgay(don)}
          </div>
          {phu && (
            <div className="mt-0.5 text-[12px] text-[color:var(--emp-muted)]">
              {phu}
            </div>
          )}
        </div>
        <Tag
          color={TRANG_THAI_TAG_COLOR[don.trangThai]}
          style={{ borderRadius: 999, marginInlineEnd: 0 }}
        >
          {labelFor(TRANG_THAI_OPTIONS, don.trangThai)}
        </Tag>
      </div>

      {don.lyDo && (
        <div className="mt-2 whitespace-pre-wrap break-words text-[13px]">
          {don.lyDo}
        </div>
      )}

      {/* Ghi chú là nơi người duyệt viết lý do từ chối — phần quan trọng nhất
          của một đơn bị từ chối, không được giấu. */}
      {don.ghiChu && (
        <div className="mt-1.5 text-[12px] text-[color:var(--emp-text-phu)]">
          Ghi chú: {don.ghiChu}
        </div>
      )}

      {huyDuoc && (
        <Popconfirm
          title="Huỷ đơn này?"
          description="Đơn sẽ bị gỡ khỏi hàng chờ duyệt."
          // KHÔNG để okText trùng nhãn nút mở ("Huỷ đơn"): trùng thì trên màn
          // hình lúc đó có hai nút cùng chữ, người dùng bấm nhầm cái mở lại.
          okText="Xác nhận huỷ"
          cancelText="Không"
          onConfirm={onHuy}
        >
          <Button
            className="mt-3"
            block
            danger
            loading={dangHuy}
            style={{ borderRadius: 999 }}
          >
            Huỷ đơn
          </Button>
        </Popconfirm>
      )}
    </div>
  );
}
