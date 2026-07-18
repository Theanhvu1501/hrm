import { Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useTableColumnFilters } from "@/components/table/useTableColumnFilters";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";
import { DongTienSummary } from "../../handler/sub-handler/init/init.state";

const { Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

/** Lấy ô theo key cột cho bộ lọc header (chỉ cột chữ mới lọc được). */
const getCell = (row: DongTienSummary, key: string): string | undefined =>
  key === "dongTien" ? row.dongTien : undefined;

export function DongTienTab() {
  const [summaryByDongTien] = useNhatKyChungState("summaryByDongTien", []);
  const [loading] = useNhatKyChungState("loading", false);

  const { filterable, matches, hasPinned } = useTableColumnFilters(
    "nkc-dong-tien",
  );

  const rows = useMemo(
    () => (summaryByDongTien || []).filter((r) => matches(r, getCell)),
    [summaryByDongTien, matches],
  );

  const columns: ColumnsType<DongTienSummary> = [
    filterable({
      title: "Loại dòng tiền",
      dataIndex: "dongTien",
      key: "dongTien",
      width: 220,
      render: (t: string) => <Tag color="cyan">{t}</Tag>,
    }),
    {
      title: "Số bút toán",
      dataIndex: "soButToan",
      key: "soButToan",
      align: "center" as const,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Tổng thu",
      dataIndex: "tongThu",
      key: "tongThu",
      align: "right" as const,
      render: (v: number) => (
        <Text className="text-green-600">
          {v > 0 ? formatCurrency(v) : "-"}
        </Text>
      ),
    },
    {
      title: "Tổng chi",
      dataIndex: "tongChi",
      key: "tongChi",
      align: "right" as const,
      render: (v: number) => (
        <Text className="text-red-600">
          {v > 0 ? formatCurrency(v) : "-"}
        </Text>
      ),
    },
  ];

  return (
    <Table<DongTienSummary>
      className="excel-table"
      columns={columns}
      dataSource={rows}
      rowKey="dongTien"
      loading={loading}
      pagination={false}
      size="small"
      // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được → cần scroll.x.
      scroll={{ x: hasPinned ? "max-content" : undefined }}
    />
  );
}
