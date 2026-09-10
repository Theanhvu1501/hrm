import { useMemo } from "react";
import { Button, DatePicker, Popconfirm, Tooltip } from "antd";
import { LockOutlined, PrinterOutlined, SyncOutlined, UnlockOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  useBangCongHandler,
  useBangCongState,
} from "../../BangCongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { Timesheet } from "@/services/timesheetService";
import { tomTatThang } from "../../tomTatBangCong";
import { TRANG_THAI_OPTIONS, TRANG_THAI_TONE, labelFor } from "../../constants";
import "./BangCongHeader.state";

export function BangCongHeader() {
  const handler = useBangCongHandler();
  const [thang] = useBangCongState("thang", dayjs().format("YYYY-MM"));
  const [timesheetList] = useBangCongState("timesheetList", [] as Timesheet[]);
  const [generating] = useBangCongState("generating", false);
  const [finalizing] = useBangCongState("finalizing", false);
  const [reopening] = useBangCongState("reopening", false);
  const { canCreate, canEdit, canExport } = usePagePermission("/cham-cong/bang-cong");

  const trangThai = useMemo((): { label: string; tone: PillTone } => {
    if (timesheetList.length === 0) {
      return { label: "Chưa tạo", tone: "trung-tinh" };
    }
    const allChot = timesheetList.every((item) => item.trangThai === "chot");
    const ma = allChot ? "chot" : "nhap";
    return { label: labelFor(TRANG_THAI_OPTIONS, ma), tone: TRANG_THAI_TONE[ma] };
  }, [timesheetList]);

  const isChot =
    timesheetList.length > 0 &&
    timesheetList.every((item) => item.trangThai === "chot");

  // Nút "Mở lại" chỉ có ý nghĩa khi có ÍT NHẤT MỘT dòng đã chốt trong tháng
  // đang xem — dùng `some`, không phải `every`/isChot, vì generate() có thể
  // bỏ qua một số dòng đã chốt trong khi các dòng khác vẫn ở trạng thái nháp.
  const coDongDaChot = timesheetList.some((item) => item.trangThai === "chot");

  const tomTat = useMemo(() => tomTatThang(timesheetList), [timesheetList]);
  // isChot (mọi dòng đã chốt) là lý do KHÔNG được chốt lại rõ ràng hơn số ô
  // trống — nếu đã chốt hết thì không còn gì để chốt nữa, bất kể tomTat nói
  // gì (tomTatThang() không biết về trạng thái chốt, chỉ đếm ô).
  const chotBiKhoa = isChot || !tomTat.coTheChot;
  const lyDoKhongChot = isChot ? "Bảng công đã chốt" : tomTat.lyDoKhongChot;

  const handleChangeThang = (date: Dayjs | null) => {
    if (!date) return;
    handler.executeEvent("changeThang", { thang: date.format("YYYY-MM") });
  };

  const handleGenerate = () => {
    handler.executeEvent("generateBangCong", { thang });
  };

  const handleFinalize = () => {
    handler.executeEvent("finalizeBangCong", { thang });
  };

  const handleMoLai = () => {
    handler.executeEvent("moLaiBangCong", { thang });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <FilterBar
      filters={
        <>
          <DatePicker
            picker="month"
            value={thang ? dayjs(thang, "YYYY-MM") : undefined}
            onChange={handleChangeThang}
            format="MM/YYYY"
            allowClear={false}
          />
          <StatusPill tone={trangThai.tone}>{trangThai.label}</StatusPill>
          {(tomTat.soOTrong > 0 || tomTat.soOCanhBao > 0) && (
            // Màu cam khi còn ô TRỐNG (chặn chốt) — nặng hơn cảnh báo (chỉ cần
            // xem lại, không chặn chốt).
            <span
              className={`whitespace-nowrap text-[11px] ${
                tomTat.soOTrong > 0
                  ? "text-[hsl(var(--amber-ink))]"
                  : "text-[hsl(var(--ink-2))]"
              }`}
            >
              Còn {tomTat.soOTrong} ô chưa xử lý · {tomTat.soOCanhBao} ô cảnh báo
            </span>
          )}
        </>
      }
      actions={
        <>
          {canCreate && (
            <Button
              icon={<SyncOutlined />}
              onClick={handleGenerate}
              loading={generating}
              disabled={isChot}
            >
              Tổng hợp bảng công
            </Button>
          )}
          {canExport && (
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              disabled={timesheetList.length === 0}
            >
              In bảng chấm công
            </Button>
          )}
          {canEdit && coDongDaChot && (
            <Popconfirm
              title="Mở lại bảng công tháng này?"
              description="Các dòng đã chốt sẽ quay về trạng thái nháp để sửa tiếp."
              onConfirm={handleMoLai}
              okText="Mở lại"
              cancelText="Huỷ"
            >
              <Button icon={<UnlockOutlined />} loading={reopening}>
                Mở lại
              </Button>
            </Popconfirm>
          )}
          {canEdit && (
            // antd không hiện Tooltip trên Button đã disabled — phải bọc thêm
            // một span, nếu không lý do "còn N ô chưa xử lý" bị câm và HR chỉ
            // thấy nút mờ mà không biết vì sao.
            <Tooltip title={chotBiKhoa ? lyDoKhongChot : ""}>
              <span>
                <Popconfirm
                  title="Chốt bảng công tháng này?"
                  description="Sau khi chốt, bảng công sẽ không thể chỉnh sửa."
                  onConfirm={handleFinalize}
                  okText="Chốt"
                  cancelText="Huỷ"
                  disabled={chotBiKhoa}
                >
                  <Button
                    type="primary"
                    danger
                    icon={<LockOutlined />}
                    loading={finalizing}
                    disabled={chotBiKhoa}
                  >
                    Chốt bảng công
                  </Button>
                </Popconfirm>
              </span>
            </Tooltip>
          )}
        </>
      }
    />
  );
}
