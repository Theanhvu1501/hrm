import { Table, Tag, Alert, Tooltip } from "antd";
import { useImportState } from "../ImportHandlerContext";
import { RowValidationResult } from "../lib/columns";

export function PreviewTable() {
  const [results] = useImportState("results", [] as RowValidationResult[]);
  const [parsed] = useImportState("parsed", false);

  if (!parsed) return null;

  const errorCount = results ? results.filter((r) => r.errors.length > 0).length : 0;
  const okCount = results ? results.length - errorCount : 0;
  const warnCount = results ? results.filter((r) => r.warnings.length > 0).length : 0;

  const columns = [
    { title: "Dòng", dataIndex: "rowNumber", key: "rowNumber", width: 70 },
    {
      title: "Trạng thái",
      key: "status",
      width: 110,
      render: (_: unknown, r: RowValidationResult) =>
        r.errors.length > 0 ? <Tag color="red">Lỗi</Tag> : <Tag color="green">Hợp lệ</Tag>,
    },
    {
      title: "Chi tiết",
      key: "detail",
      render: (_: unknown, r: RowValidationResult) => (
        <div>
          {r.errors.map((e, i) => (
            <div key={`e${i}`} style={{ color: "#cf1322" }}>• {e.message}</div>
          ))}
          {r.warnings.map((w, i) => (
            <div key={`w${i}`} style={{ color: "#d46b08" }}>⚠ {w.message}</div>
          ))}
          {r.errors.length === 0 && r.warnings.length === 0 && (
            <span style={{ color: "#389e0d" }}>OK</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <Alert
        type={errorCount > 0 ? "error" : "success"}
        showIcon
        message={
          <Tooltip title={`${warnCount} dòng có cảnh báo`}>
            {`Hợp lệ: ${okCount} • Lỗi: ${errorCount} • Cảnh báo: ${warnCount}`}
          </Tooltip>
        }
        style={{ marginBottom: 12 }}
      />
      <Table
        className="excel-table"
        size="small"
        rowKey="rowNumber"
        dataSource={results ?? []}
        columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ y: 360 }}
        rowClassName={(r) => (r.errors.length > 0 ? "import-row-error" : "")}
      />
    </div>
  );
}
