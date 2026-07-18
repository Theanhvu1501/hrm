import { useMemo } from "react";
import { Button, DatePicker, Popconfirm, Space, Tag } from "antd";
import { LockOutlined, SyncOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  useBangCongHandler,
  useBangCongState,
} from "../../BangCongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { Timesheet } from "@/services/timesheetService";
import "./BangCongHeader.state";

export function BangCongHeader() {
  const handler = useBangCongHandler();
  const [thang] = useBangCongState("thang", dayjs().format("YYYY-MM"));
  const [timesheetList] = useBangCongState("timesheetList", [] as Timesheet[]);
  const [generating] = useBangCongState("generating", false);
  const [finalizing] = useBangCongState("finalizing", false);
  const { canCreate, canEdit } = usePagePermission("/cham-cong/bang-cong");

  const trangThai = useMemo(() => {
    if (timesheetList.length === 0) {
      return { label: "Chưa tạo", color: "default" };
    }
    const allChot = timesheetList.every((item) => item.trangThai === "chot");
    return allChot
      ? { label: "Đã chốt", color: "green" }
      : { label: "Nháp", color: "gold" };
  }, [timesheetList]);

  const isChot =
    timesheetList.length > 0 &&
    timesheetList.every((item) => item.trangThai === "chot");

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

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Tổng hợp bảng công
        </h1>
        <p className="text-muted-foreground">
          Tổng hợp công theo tháng: ngày công, giờ làm thêm, đi muộn/về sớm
        </p>
      </div>
      <Space wrap align="center">
        <DatePicker
          picker="month"
          value={thang ? dayjs(thang, "YYYY-MM") : undefined}
          onChange={handleChangeThang}
          format="MM/YYYY"
          allowClear={false}
        />
        <Tag color={trangThai.color}>{trangThai.label}</Tag>
        {canCreate && (
          <Button
            icon={<SyncOutlined />}
            onClick={handleGenerate}
            loading={generating}
            disabled={isChot}
          >
            Tạo/Cập nhật bảng công
          </Button>
        )}
        {canEdit && (
          <Popconfirm
            title="Chốt bảng công tháng này?"
            description="Sau khi chốt, bảng công sẽ không thể chỉnh sửa."
            onConfirm={handleFinalize}
            okText="Chốt"
            cancelText="Huỷ"
            disabled={isChot || timesheetList.length === 0}
          >
            <Button
              type="primary"
              danger
              icon={<LockOutlined />}
              loading={finalizing}
              disabled={isChot || timesheetList.length === 0}
            >
              Chốt bảng công
            </Button>
          </Popconfirm>
        )}
      </Space>
    </div>
  );
}
