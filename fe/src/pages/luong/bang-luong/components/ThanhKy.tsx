import {
  Button,
  DatePicker,
  Popconfirm,
  Segmented,
  Tooltip,
  message,
} from "antd";
import { useState } from "react";
import { apiErrorMessage } from "@/config/api";
import { bangLuongService } from "@/services/bangLuongService";
import {
  ImportOutlined,
  LockOutlined,
  PrinterOutlined,
  SendOutlined,
  SyncOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  useBangLuongHandler,
  useBangLuongState,
} from "../BangLuongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { StatusPill } from "@/components/ui/StatusPill";
import type { DongLuong } from "@/services/bangLuongService";
import "../BangLuongPage.state";

export function ThanhKy({
  onImport,
  onIn,
}: {
  onImport: () => void;
  onIn: () => void;
}) {
  const handler = useBangLuongHandler();
  const [thang] = useBangLuongState("thang", dayjs().format("YYYY-MM"));
  const [danhSach] = useBangLuongState("danhSach", [] as DongLuong[]);
  const [dangTongHop] = useBangLuongState("dangTongHop", false);
  const [tabDangXem, setTabDangXem] = useBangLuongState(
    "tabDangXem",
    "khaiBao" as "khaiBao" | "thucTe"
  );
  const [daChot] = useBangLuongState("daChot", false);
  const { canEdit } = usePagePermission("/luong/bang-luong");

  const handleChangeThang = (date: Dayjs | null) => {
    if (!date) return;
    handler.executeEvent("doiThang", { thang: date.format("YYYY-MM") });
  };

  const handleTongHop = () => {
    handler.executeEvent("tongHop", { thang });
  };

  const handleChot = () => {
    handler.executeEvent("chot", { thang });
  };

  const handleMoLai = () => {
    handler.executeEvent("moLai", { thang });
  };

  const [dangGui, setDangGui] = useState(false);

  /**
   * Gửi phiếu lương cho người lao động (yêu cầu d36). Tách khỏi "Chốt kỳ": kế
   * toán còn rà lại sau khi chốt, và phiếu chỉ hiện với NLĐ sau khi bấm nút
   * này.
   */
  const guiPhieu = async () => {
    setDangGui(true);
    try {
      const kq = await bangLuongService.guiPhieuLuong(thang);
      if (kq.soPhieu === 0 && kq.boQua > 0) {
        message.warning(
          `Chưa gửi được phiếu nào — còn ${kq.boQua} dòng chưa chốt.`,
        );
      } else {
        message.success(
          `Đã gửi ${kq.soPhieu} phiếu lương${kq.boQua ? `, bỏ qua ${kq.boQua} dòng chưa chốt` : ""}.`,
        );
      }
    } catch (err) {
      message.error(apiErrorMessage(err, "Gửi phiếu lương thất bại"));
    } finally {
      setDangGui(false);
    }
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
          <StatusPill tone={daChot ? "ok" : "nhap"}>
            {daChot ? "Đã chốt" : "Nháp"}
          </StatusPill>
          <Segmented
            value={tabDangXem}
            onChange={(value) => setTabDangXem(value as "khaiBao" | "thucTe")}
            options={[
              { label: "Khai báo", value: "khaiBao" },
              { label: "Thực tế", value: "thucTe" },
            ]}
          />
        </>
      }
      actions={
        <>
          {/* Chỉ hiện khi ĐÃ có bảng lương: import vào một kỳ chưa tổng hợp thì
              mọi dòng đều báo "không có dòng lương trong kỳ" — mời người dùng làm
              một việc chắc chắn hỏng. */}
          {canEdit && daChot && (
            <Tooltip title="Sau khi gửi, mỗi nhân viên xem được phiếu lương CỦA MÌNH trong ứng dụng">
              <Popconfirm
                title="Gửi phiếu lương tháng này cho nhân viên?"
                description="Chỉ gửi các dòng đã chốt. Nhân viên sẽ xem được phiếu của chính họ."
                onConfirm={guiPhieu}
                okText="Gửi"
                cancelText="Huỷ"
              >
                <Button icon={<SendOutlined />} loading={dangGui}>
                  Gửi phiếu lương
                </Button>
              </Popconfirm>
            </Tooltip>
          )}
          {danhSach.length > 0 && (
            <Tooltip title="Chọn chỉ tiêu muốn in: bản đầy đủ hoặc bản gọn">
              <Button icon={<PrinterOutlined />} onClick={onIn}>
                In bảng lương
              </Button>
            </Tooltip>
          )}
          {canEdit && danhSach.length > 0 && (
            <Button icon={<ImportOutlined />} onClick={onImport}>
              Import hiệu suất / thưởng
            </Button>
          )}
          {canEdit && (
            <Button
              icon={<SyncOutlined />}
              onClick={handleTongHop}
              loading={dangTongHop}
              disabled={daChot}
            >
              Tổng hợp
            </Button>
          )}
          {canEdit && !daChot && (
            <Popconfirm
              title="Chốt kỳ lương tháng này?"
              description="Sau khi chốt, các ô biến động sẽ không thể chỉnh sửa."
              onConfirm={handleChot}
              okText="Chốt"
              cancelText="Huỷ"
              disabled={danhSach.length === 0}
            >
              <Button type="primary" danger icon={<LockOutlined />} disabled={danhSach.length === 0}>
                Chốt kỳ
              </Button>
            </Popconfirm>
          )}
          {canEdit && daChot && (
            <Popconfirm
              title="Mở lại kỳ lương tháng này?"
              description="Mở lại để cho phép sửa các khoản biến động."
              onConfirm={handleMoLai}
              okText="Mở lại"
              cancelText="Huỷ"
            >
              <Button icon={<UnlockOutlined />}>Mở lại</Button>
            </Popconfirm>
          )}
        </>
      }
    />
  );
}
