import { Table, Space, Typography } from "antd";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";

const { Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export function SummaryTab() {
  const [summaryByAccount] = useNhatKyChungState("summaryByAccount", []);
  const [taiKhoanList] = useNhatKyChungState("taiKhoanList", []);
  const [loading] = useNhatKyChungState("loading", false);

  const columns = [
    {
      title: "Tài khoản",
      dataIndex: "taiKhoan",
      key: "taiKhoan",
      width: 120,
      render: (text: string) => {
        const tk = taiKhoanList?.find((t) => t.ma === text);
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{text}</Text>
            {tk && (
              <Text type="secondary" className="text-xs">
                {tk.ten}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: "Phát sinh Nợ",
      dataIndex: "phatSinhNo",
      key: "phatSinhNo",
      align: "right" as const,
      render: (value: number) => (
        <Text className={value > 0 ? "text-blue-600" : ""}>
          {value > 0 ? formatCurrency(value) : "-"}
        </Text>
      ),
    },
    {
      title: "Phát sinh Có",
      dataIndex: "phatSinhCo",
      key: "phatSinhCo",
      align: "right" as const,
      render: (value: number) => (
        <Text className={value > 0 ? "text-green-600" : ""}>
          {value > 0 ? formatCurrency(value) : "-"}
        </Text>
      ),
    },
    {
      title: "Chênh lệch",
      key: "chenhLech",
      align: "right" as const,
      render: (_: any, record: { phatSinhNo: number; phatSinhCo: number }) => {
        const diff = record.phatSinhNo - record.phatSinhCo;
        return (
          <Text
            strong
            className={
              diff > 0 ? "text-blue-600" : diff < 0 ? "text-red-600" : ""
            }
          >
            {diff !== 0 ? formatCurrency(Math.abs(diff)) : "-"}
            {diff > 0 ? " (Nợ)" : diff < 0 ? " (Có)" : ""}
          </Text>
        );
      },
    },
  ];

  return (
    <Table
      className="excel-table"
      columns={columns}
      dataSource={summaryByAccount || []}
      rowKey="taiKhoan"
      loading={loading}
      pagination={false}
      size="small"
      summary={(pageData) => {
        const totalNo = pageData.reduce((sum, r) => sum + r.phatSinhNo, 0);
        const totalCo = pageData.reduce((sum, r) => sum + r.phatSinhCo, 0);
        return (
          <Table.Summary fixed>
            <Table.Summary.Row className="bg-muted/50">
              <Table.Summary.Cell index={0}>
                <Text strong>Tổng cộng</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong className="text-blue-600">
                  {formatCurrency(totalNo)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text strong className="text-green-600">
                  {formatCurrency(totalCo)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <Text
                  strong
                  className={
                    totalNo === totalCo ? "text-green-600" : "text-red-600"
                  }
                >
                  {totalNo === totalCo
                    ? "Cân bằng ✓"
                    : `Chênh lệch: ${formatCurrency(Math.abs(totalNo - totalCo))}`}
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        );
      }}
    />
  );
}
