import { Button, DatePicker, Popconfirm, Segmented, Space, Tag } from "antd";
import { LockOutlined, SyncOutlined, UnlockOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  useBangLuongHandler,
  useBangLuongState,
} from "../BangLuongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import type { DongLuong } from "@/services/bangLuongService";
import "../BangLuongPage.state";

export function ThanhKy() {
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

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bảng lương</h1>
        <p className="text-muted-foreground">
          Tổng hợp lương theo tháng: khai báo và thực tế, sửa khoản biến động, chốt kỳ
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
        <Tag color={daChot ? "green" : "gold"}>{daChot ? "Đã chốt" : "Nháp"}</Tag>
        <Segmented
          value={tabDangXem}
          onChange={(value) => setTabDangXem(value as "khaiBao" | "thucTe")}
          options={[
            { label: "Khai báo", value: "khaiBao" },
            { label: "Thực tế", value: "thucTe" },
          ]}
        />
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
      </Space>
    </div>
  );
}
