import { Button, DatePicker, Popconfirm } from "antd";
import {
  DownloadOutlined,
  LockOutlined,
  SyncOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  useBangThemGioHandler,
  useBangThemGioState,
} from "../BangThemGioHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { StatusPill } from "@/components/ui/StatusPill";
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
    <FilterBar
      filters={
        <>
          <DatePicker
            picker="month"
            value={thang ? dayjs(thang, "YYYY-MM") : undefined}
            onChange={doiThang}
            format="MM/YYYY"
            allowClear={false}
          />
          <StatusPill tone={daChot ? "ok" : "nhap"}>
            {daChot ? "Đã chốt" : "Nháp"}
          </StatusPill>
        </>
      }
      actions={
        <>
          {canEdit && !daChot && (
            <Button
              icon={<SyncOutlined />}
              loading={dangTongHop}
              onClick={() => handler.executeEvent("tongHop", { thang })}
            >
              Tổng hợp
            </Button>
          )}

          <Button icon={<DownloadOutlined />} onClick={onXuat}>
            Xuất 03-LĐTL
          </Button>

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
        </>
      }
    />
  );
}
