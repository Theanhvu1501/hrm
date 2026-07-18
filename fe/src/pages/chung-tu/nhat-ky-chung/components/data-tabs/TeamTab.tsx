import { Table, Tag, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { TeamOutlined, UserOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { useTableColumnFilters } from "@/components/table/useTableColumnFilters";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";
import { TeamSummary } from "../../handler/sub-handler/init/init.state";

const { Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

/** Lấy ô theo key cột cho bộ lọc header (chỉ cột chữ mới lọc được). */
const getCell = (row: TeamSummary, key: string): string | undefined =>
  key === "doi" ? row.doi : undefined;

export function TeamTab() {
  const [summaryByTeam] = useNhatKyChungState("summaryByTeam", []);
  const [loading] = useNhatKyChungState("loading", false);

  const { filterable, matches, hasPinned } = useTableColumnFilters("nkc-doi");

  // Lọc trên dữ liệu gốc; tổng chi (mẫu số của cột Tỷ lệ) và dòng "Tổng cộng"
  // được cộng lại theo đúng những đội còn hiển thị → tỷ lệ vẫn cộng đủ 100%.
  const rows = useMemo(
    () => (summaryByTeam || []).filter((r) => matches(r, getCell)),
    [summaryByTeam, matches],
  );

  const totalChi = rows.reduce((sum, t) => sum + t.tongChi, 0);

  const columns: ColumnsType<TeamSummary> = [
    filterable({
      title: "Đội",
      dataIndex: "doi",
      key: "doi",
      width: 200,
      render: (text: string) => (
        <Space>
          <TeamOutlined className="text-purple-500" />
          <Text strong>{text}</Text>
        </Space>
      ),
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
      render: (_: unknown, record: { tongChi: number }) => {
        const percent = totalChi > 0 ? ((record.tongChi / totalChi) * 100).toFixed(1) : "0";
        return <Tag color="orange">{percent}%</Tag>;
      },
    },
  ];

  return (
    <>
      <div className="mb-4">
        <Text type="secondary">
          Tổng hợp chi phí theo đội thi công, hiển thị chi tiết phân bổ cho từng nhân viên
        </Text>
      </div>
      <Table<TeamSummary>
        className="excel-table"
        columns={columns}
        dataSource={rows}
        rowKey="doi"
        loading={loading}
        pagination={false}
        size="small"
        // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được → cần scroll.x.
        scroll={{ x: hasPinned ? "max-content" : undefined }}
        expandable={{
          expandedRowRender: (record) => (
            <Table
              columns={[
                {
                  title: "Nhân viên",
                  dataIndex: "nhanVien",
                  key: "nhanVien",
                  render: (text: string) => (
                    <Space>
                      <UserOutlined className="text-gray-400" />
                      <Text>{text}</Text>
                    </Space>
                  ),
                },
                {
                  title: "Số bút toán",
                  dataIndex: "soButToan",
                  key: "soButToan",
                  align: "center" as const,
                  render: (v: number) => <Tag>{v}</Tag>,
                },
                {
                  title: "Số tiền",
                  dataIndex: "soTien",
                  key: "soTien",
                  align: "right" as const,
                  render: (v: number) => (
                    <Text className="text-red-500">{formatCurrency(v)}</Text>
                  ),
                },
                {
                  title: "Tỷ lệ trong đội",
                  key: "tyLeNV",
                  align: "right" as const,
                  render: (_: unknown, r: { soTien: number }) => {
                    const percent =
                      record.tongChi > 0
                        ? ((r.soTien / record.tongChi) * 100).toFixed(1)
                        : "0";
                    return <Tag color="cyan">{percent}%</Tag>;
                  },
                },
              ]}
              dataSource={record.chiTiet}
              rowKey="nhanVien"
              pagination={false}
              size="small"
            />
          ),
          rowExpandable: (record) => record.chiTiet && record.chiTiet.length > 0,
        }}
        summary={(pageData) => {
          const totalChiSum = pageData.reduce((sum, r) => sum + r.tongChi, 0);
          const totalButToan = pageData.reduce((sum, r) => sum + r.soButToan, 0);
          return (
            <Table.Summary fixed>
              <Table.Summary.Row className="bg-muted/50">
                {/* Empty cell for expand icon column */}
                <Table.Summary.Cell index={0} />
                <Table.Summary.Cell index={1}>
                  <Text strong>Tổng cộng</Text>
                </Table.Summary.Cell>
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
