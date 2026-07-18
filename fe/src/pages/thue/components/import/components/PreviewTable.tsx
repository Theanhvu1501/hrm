import { Table, Tooltip, Typography, Alert, Space } from "antd";
import dayjs from "dayjs";
import {
  BangKeVariant,
  ImportColumnKey,
  RawImportRow,
  RowValidationResult,
  buildColumns,
} from "../lib/columns";

const { Text } = Typography;

interface Props {
  variant: BangKeVariant;
  rows: RawImportRow[];
  results: RowValidationResult[];
}

const cellText = (v: string | Date | undefined): string => {
  if (v instanceof Date) return dayjs(v).format("DD/MM/YYYY");
  return v ?? "";
};

export function PreviewTable({ variant, rows, results }: Props) {
  if (results.length === 0) return null;

  const byRow = new Map(results.map((r) => [r.rowNumber, r]));
  const errorCount = results.filter((r) => r.errors.length > 0).length;
  const warningCount = results.filter(
    (r) => r.errors.length === 0 && r.warnings.length > 0,
  ).length;
  const validCount = results.length - errorCount;

  const columns = [
    {
      title: "Dòng",
      dataIndex: "rowNumber",
      key: "rowNumber",
      width: 60,
      fixed: "left" as const,
    },
    ...buildColumns(variant).map((col) => ({
      title: col.header,
      dataIndex: col.key,
      key: col.key,
      width: col.key === "tenHangHoa" || col.key === "ten" ? 180 : 130,
      render: (value: string | Date | undefined, row: RawImportRow) => {
        const result = byRow.get(row.rowNumber);
        const problems = [
          ...(result?.errors ?? []).filter((e) => e.field === col.key),
          ...(result?.warnings ?? []).filter((w) => w.field === col.key),
        ];
        const isError = (result?.errors ?? []).some(
          (e) => e.field === (col.key as ImportColumnKey),
        );
        const text = cellText(value);
        if (problems.length === 0) return text;
        return (
          <Tooltip title={problems.map((p) => p.message).join("; ")}>
            <Text type={isError ? "danger" : "warning"} strong>
              {text || "(trống)"}
            </Text>
          </Tooltip>
        );
      },
    })),
    {
      title: "Ghi nhận",
      key: "problems",
      width: 220,
      render: (_: unknown, row: RawImportRow) => {
        const result = byRow.get(row.rowNumber);
        if (!result) return null;
        return (
          <Space direction="vertical" size={0}>
            {result.errors.map((e, i) => (
              <Text key={`e${i}`} type="danger">
                {e.message}
              </Text>
            ))}
            {result.warnings.map((w, i) => (
              <Text key={`w${i}`} type="warning">
                {w.message}
              </Text>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="small" className="mt-4">
      <Alert
        type={errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "success"}
        showIcon
        message={
          `${validCount} dòng hợp lệ · ${errorCount} dòng lỗi · ${warningCount} dòng cảnh báo` +
          (errorCount > 0 ? " — sửa file rồi tải lại để import" : "")
        }
      />
      <Table
        size="small"
        rowKey="rowNumber"
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        scroll={{ x: 1200, y: 320 }}
        rowClassName={(row) => {
          const result = byRow.get(row.rowNumber);
          if (!result) return "";
          if (result.errors.length > 0) return "bg-red-50";
          if (result.warnings.length > 0) return "bg-amber-50";
          return "";
        }}
      />
    </Space>
  );
}
