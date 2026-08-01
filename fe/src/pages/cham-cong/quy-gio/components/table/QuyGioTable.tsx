import { useMemo } from "react";
import { Table, Tag, Select, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuyGioHandler, useQuyGioState } from "../../QuyGioHandlerContext";
import { OvertimeBalanceRow } from "@/services/overtimeBalanceService";
import { Employee } from "@/services/employeeService";
import { homNayVN } from "@/ultils/thoiGianVN";
import { HAN_DUNG_VO_HAN, mucCanhBao } from "../../sapHetHan";
import "./QuyGioTable.state";

const NHAN_TRANG_THAI: Record<string, string> = {
  dang_hieu_luc: "Đang hiệu lực",
  da_dong: "Đã đóng",
};

// Cột số: tabular-nums để chữ số thẳng cột giữa các hàng.
const O_SO: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  textAlign: "right" as const,
};

export function QuyGioTable() {
  const handler = useQuyGioHandler();
  const [danhSach] = useQuyGioState("danhSach", [] as OvertimeBalanceRow[]);
  const [employeeList] = useQuyGioState("employeeList", [] as Employee[]);
  const [employeeId] = useQuyGioState("employeeId", undefined as string | undefined);
  const [dangTai] = useQuyGioState("dangTai", false);

  const homNay = homNayVN();

  const employeeOptions = useMemo(
    () =>
      employeeList.map((e) => ({
        value: e.id,
        label: `${e.hoTen} (${e.employeeId})`,
      })),
    [employeeList]
  );

  const columns: ColumnsType<OvertimeBalanceRow> = [
    { title: "Kỳ tích", dataIndex: "kyTich", key: "kyTich", width: 100 },
    {
      title: "Giờ tích",
      dataIndex: "soGioTich",
      key: "soGioTich",
      width: 100,
      align: "right",
      onCell: () => ({ style: O_SO }),
    },
    {
      title: "Đã dùng",
      dataIndex: "soGioDaDung",
      key: "soGioDaDung",
      width: 100,
      align: "right",
      onCell: () => ({ style: O_SO }),
    },
    {
      title: "Đang chờ duyệt",
      dataIndex: "soGioDangChoDuyet",
      key: "soGioDangChoDuyet",
      width: 130,
      align: "right",
      onCell: () => ({ style: O_SO }),
    },
    {
      title: "Còn lại",
      dataIndex: "soGioConLai",
      key: "soGioConLai",
      width: 100,
      align: "right",
      onCell: () => ({ style: O_SO }),
      render: (v: number) => <strong>{v}</strong>,
    },
    {
      title: "Hạn dùng",
      dataIndex: "hanDung",
      key: "hanDung",
      width: 180,
      render: (v: string) => {
        // '9999-12-31' = không hết hạn — KHÔNG BAO GIỜ tô cảnh báo cho mốc
        // này, tô là báo động giả vĩnh viễn trên mọi hàng dùng mốc này.
        if (v === HAN_DUNG_VO_HAN) return "Không hết hạn";

        const muc = mucCanhBao(v, homNay);
        if (muc === "het_han") return <Tag color="error">{v} — đã hết hạn</Tag>;
        if (muc === "sap_het") return <Tag color="warning">{v} — sắp hết hạn</Tag>;
        return v;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 130,
      render: (v: string) => (
        <Tag color={v === "dang_hieu_luc" ? "green" : "default"}>
          {NHAN_TRANG_THAI[v] ?? v}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quỹ giờ làm thêm</h1>
          <p className="text-muted-foreground">
            Số giờ làm thêm đã tích, đã dùng và còn lại của một nhân viên, theo từng kỳ tích
          </p>
        </div>
        <Select
          showSearch
          allowClear
          optionFilterProp="label"
          placeholder="Chọn nhân viên để xem quỹ"
          style={{ width: 280 }}
          options={employeeOptions}
          value={employeeId}
          onChange={(v) => handler.executeEvent("chonNhanVien", { employeeId: v })}
        />
      </div>

      <Table<OvertimeBalanceRow>
        columns={columns}
        dataSource={danhSach}
        rowKey="id"
        loading={dangTai}
        pagination={{ pageSize: 15 }}
        bordered
        scroll={{ x: "max-content" }}
        locale={{
          emptyText: (
            <Empty
              description={
                employeeId
                  ? "Nhân viên này chưa có quỹ giờ làm thêm nào"
                  : "Chọn một nhân viên ở trên để xem quỹ giờ làm thêm"
              }
            />
          ),
        }}
      />
    </div>
  );
}
