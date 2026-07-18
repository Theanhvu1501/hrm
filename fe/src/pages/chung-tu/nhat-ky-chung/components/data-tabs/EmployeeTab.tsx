import { Table, Tag, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { UserOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { useTableColumnFilters } from "@/components/table/useTableColumnFilters";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";

const { Text } = Typography;

interface EmployeeSummary {
  nhanVien: string;
  doi: string;
  soButToan: number;
  tongChi: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

/** Lấy ô theo key cột cho bộ lọc header (chỉ cột chữ mới lọc được). */
const getCell = (row: EmployeeSummary, key: string): string | undefined => {
  if (key === "nhanVien") return row.nhanVien;
  if (key === "doi") return row.doi;
  return undefined;
};

export function EmployeeTab() {
  const [summaryByEmployee] = useNhatKyChungState("summaryByEmployee", []);
  const [loading] = useNhatKyChungState("loading", false);

  const { filterable, matches, hasPinned } = useTableColumnFilters(
    "nkc-nhan-vien",
  );

  // Lọc trên dữ liệu gốc; tổng chi (mẫu số của cột Tỷ lệ) và dòng "Tổng cộng"
  // được cộng lại theo đúng những dòng còn hiển thị → tỷ lệ vẫn cộng đủ 100%.
  const rows = useMemo(
    () => (summaryByEmployee || []).filter((r) => matches(r, getCell)),
    [summaryByEmployee, matches],
  );

  const totalChi = rows.reduce((sum, e) => sum + e.tongChi, 0);

  const columns: ColumnsType<EmployeeSummary> = [
    filterable({
      title: "Nhân viên",
      dataIndex: "nhanVien",
      key: "nhanVien",
      width: 180,
      render: (text: string) => (
        <Space>
          <UserOutlined className="text-blue-500" />
          <Text strong>{text}</Text>
        </Space>
      ),
    }),
    filterable({
      title: "Đội",
      dataIndex: "doi",
      key: "doi",
      width: 160,
      render: (text: string) => <Tag color="purple">{text}</Tag>,
    }),
    {
      title: "Số bút toán",
      dataIndex: "soButToan",
      key: "soButToan",
      width: 120,
      align: "center" as const,
      render: (value: number) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Tổng chi phí",
      dataIndex: "tongChi",
      key: "tongChi",
      align: "right" as const,
      render: (value: number) => (
        <Text strong className="text-red-600">
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Tỷ lệ",
      key: "tyLe",
      width: 120,
      align: "right" as const,
      render: (_: unknown, record: EmployeeSummary) => {
        const percent = totalChi > 0 ? ((record.tongChi / totalChi) * 100).toFixed(1) : "0";
        return <Tag color="orange">{percent}%</Tag>;
      },
    },
  ];

  return (
    <>
      <div className="mb-4">
        <Text type="secondary">
          Tổng hợp chi phí theo từng nhân viên chịu trách nhiệm
        </Text>
      </div>
      <Table<EmployeeSummary>
        className="excel-table"
        columns={columns}
        dataSource={rows}
        rowKey="nhanVien"
        loading={loading}
        pagination={false}
        size="small"
        // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được → cần scroll.x.
        scroll={{ x: hasPinned ? "max-content" : undefined }}
        summary={(pageData) => {
          const totalChiSum = pageData.reduce((sum, r) => sum + r.tongChi, 0);
          const totalButToan = pageData.reduce((sum, r) => sum + r.soButToan, 0);
          return (
            <Table.Summary fixed>
              <Table.Summary.Row className="bg-muted/50">
                <Table.Summary.Cell index={0}>
                  <Text strong>Tổng cộng</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2} align="center">
                  <Text strong>{totalButToan}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong className="text-red-600">
                    {formatCurrency(totalChiSum)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Tag color="orange">100%</Tag>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </>
  );
}
