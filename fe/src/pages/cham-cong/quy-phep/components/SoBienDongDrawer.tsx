import { Drawer, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuyPhepHandler, useQuyPhepState } from "../QuyPhepHandlerContext";
import { LeaveBalance, LeaveBalanceEntry } from "@/services/leaveBalanceService";
import { ngayGioVN } from "@/ultils/thoiGianVN";
import { nhanLyDoBienDong } from "../nhanQuy";

export function SoBienDongDrawer() {
  const handler = useQuyPhepHandler();
  const [drawerQuy] = useQuyPhepState("drawerQuy", null as LeaveBalance | null);
  const [bienDong] = useQuyPhepState("bienDong", [] as LeaveBalanceEntry[]);
  const [dangTaiBienDong] = useQuyPhepState("dangTaiBienDong", false);

  const columns: ColumnsType<LeaveBalanceEntry> = [
    {
      title: "Thời điểm",
      dataIndex: "thoiDiem",
      key: "thoiDiem",
      width: 160,
      render: (v: string) => ngayGioVN(v),
    },
    {
      title: "Lý do",
      dataIndex: "lyDo",
      key: "lyDo",
      render: (v: string) => nhanLyDoBienDong(v),
    },
    {
      title: "Số ngày",
      dataIndex: "soNgay",
      key: "soNgay",
      width: 100,
      align: "right",
      render: (v: number) => (
        <span className={v >= 0 ? "text-green-600" : "text-red-600"}>
          {v >= 0 ? `+${v}` : v}
        </span>
      ),
    },
    { title: "Người thực hiện", dataIndex: "nguoiThucHien", key: "nguoiThucHien", width: 160 },
    { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu" },
  ];

  return (
    <Drawer
      title={
        drawerQuy
          ? `Sổ biến động — ${drawerQuy.employeeName ?? drawerQuy.employeeCode ?? ""} — năm ${drawerQuy.nam}`
          : "Sổ biến động"
      }
      open={!!drawerQuy}
      onClose={() => handler.executeEvent("dongSoBienDong", {})}
      width={640}
      destroyOnClose
    >
      <Table<LeaveBalanceEntry>
        columns={columns}
        dataSource={bienDong}
        rowKey="id"
        loading={dangTaiBienDong}
        size="small"
        pagination={{ pageSize: 15 }}
        scroll={{ x: "max-content" }}
      />
    </Drawer>
  );
}
