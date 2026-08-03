import { Button, DatePicker, Popconfirm, Space, Tag } from "antd";
import { LockOutlined, SyncOutlined, UnlockOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  useBangThemGioHandler,
  useBangThemGioState,
} from "../BangThemGioHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import "../BangThemGioPage.state";

export function ThanhKyThemGio({ onXuat }: { onXuat: () => void }) {
  const handler = useBangThemGioHandler();
  const [thang] = useBangThemGioState("thang", dayjs().format("YYYY-MM"));
  const [dangTongHop] = useBangThemGioState("dangTongHop", false);
  const [daChot] = useBangThemGioState("daChot", false);
  const { canEdit } = usePagePermission("/luong/bang-luong");

  const doiThang = (date: Dayjs | null) => {
    if (!date) return;
    handler.executeEvent("doiThang", { thang: date.format("YYYY-MM") });
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bảng lương thêm giờ</h1>
        <p className="text-muted-foreground">
          Mẫu số 03-LĐTL — tổng hợp tiền làm thêm theo tháng, sửa số giờ, chốt
          kỳ và xuất biểu mẫu để ký
        </p>
      </div>
      <Space wrap align="center">
        <DatePicker
          picker="month"
          value={thang ? dayjs(thang, "YYYY-MM") : undefined}
          onChange={doiThang}
          format="MM/YYYY"
          allowClear={false}
        />
        <Tag color={daChot ? "green" : "gold"}>{daChot ? "Đã chốt" : "Nháp"}</Tag>

        {canEdit && !daChot && (
          <Button
            icon={<SyncOutlined />}
            loading={dangTongHop}
            onClick={() => handler.executeEvent("tongHop", { thang })}
          >
            Tổng hợp
          </Button>
        )}

        <Button onClick={onXuat}>Xuất 03-LĐTL</Button>

        {canEdit &&
          (daChot ? (
            <Popconfirm
              title="Mở lại kỳ?"
              description="Kỳ đang chốt sẽ về trạng thái nháp và sửa được tiếp."
              onConfirm={() => handler.executeEvent("moLai", { thang })}
            >
              <Button icon={<UnlockOutlined />}>Mở lại kỳ</Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Chốt kỳ?"
              description="Chốt xong không sửa được cho tới khi mở lại kỳ."
              onConfirm={() => handler.executeEvent("chot", { thang })}
            >
              <Button type="primary" icon={<LockOutlined />}>
                Chốt kỳ
              </Button>
            </Popconfirm>
          ))}
      </Space>
    </div>
  );
}
