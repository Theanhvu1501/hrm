import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  InputNumber,
  Space,
  Typography,
  Breadcrumb,
  Tag,
  message,
} from "antd";
import { HomeOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  taxReportService,
  BaoCaoTNDN,
  DieuChinhThue,
  TNDNQuyData,
} from "@/services/taxService";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useTableColumnFilters } from "@/components/table/useTableColumnFilters";
import { filterTndnRows } from "./tndnFilter";

const { Text, Title } = Typography;

const fmt = (n?: number) => (n ?? 0).toLocaleString("vi-VN");

// Dòng "Tổng (gồm tự tính)" — 1 dòng, không wrap, cắt gọn nếu dài.
const autoTotalStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#8c8c8c",
  marginTop: 2,
  textAlign: "right",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

type CalcKey = keyof TNDNQuyData;
type InputKey = keyof Omit<DieuChinhThue, "nam">;

interface RowDef {
  key: string;
  tt?: string;
  label: string;
  kind: "calc" | "input" | "rate" | "section";
  calcKey?: CalcKey;
  inputKey?: InputKey;
  strong?: boolean;
  note?: string;
}

/** Maps inputKey of the 4 non-deductible rows → cpKhongTruAuto array index */
const NHOM_INDEX: Record<string, number> = {
  cpkdtDichVuHangHoa: 0,
  cpkdtTscdCcdc: 1,
  cpkdtNhanCong: 2,
  cpkdtTaiChinhKhac: 3,
};

const ROWS: RowDef[] = [
  { key: "r1", tt: "1", label: "Doanh thu thuần bán hàng", kind: "calc", calcKey: "dt511", note: "Có TK 511" },
  { key: "r2", tt: "2", label: "Doanh thu tài chính, lãi tiền gửi/cho vay", kind: "calc", calcKey: "dt515", note: "Có TK 515" },
  { key: "r3", tt: "3", label: "Thu nhập chịu thuế TNDN khác", kind: "calc", calcKey: "dt711", note: "Có TK 711" },
  { key: "r4", tt: "4", label: "Giá vốn hàng bán", kind: "calc", calcKey: "cp632", note: "Nợ TK 632" },
  { key: "r5", tt: "5", label: "Chi phí bán hàng", kind: "calc", calcKey: "cp641", note: "Nợ TK 641" },
  { key: "r6", tt: "6", label: "Chi phí quản lý doanh nghiệp", kind: "calc", calcKey: "cp642", note: "Nợ TK 642" },
  { key: "r7", tt: "7", label: "Chi phí khác", kind: "calc", calcKey: "cp811", note: "Nợ TK 811" },
  { key: "rTong", label: "Tổng chi phí ghi nhận", kind: "calc", calcKey: "tongChiPhi", strong: true, note: "632+641+642+811" },
  { key: "rA", tt: "A", label: "Lợi nhuận kế toán trước thuế", kind: "calc", calcKey: "lnTruocThue", strong: true },
  { key: "sec1", label: "Các khoản chi phí không được trừ", kind: "section" },
  { key: "i1", tt: "1", label: "Chi phí dịch vụ, hàng hóa mua vào", kind: "input", inputKey: "cpkdtDichVuHangHoa" },
  { key: "i2", tt: "2", label: "Chi phí về TSCĐ, CCDC, CPTT", kind: "input", inputKey: "cpkdtTscdCcdc" },
  { key: "i3", tt: "3", label: "Chi phí nhân công, bảo hiểm", kind: "input", inputKey: "cpkdtNhanCong" },
  { key: "i4", tt: "4", label: "Chi phí tài chính, chi phí khác", kind: "input", inputKey: "cpkdtTaiChinhKhac" },
  { key: "iMien", label: "Thu nhập miễn thuế", kind: "input", inputKey: "thuNhapMienThue" },
  { key: "iLo", label: "Lỗ được chuyển", kind: "input", inputKey: "loDuocChuyen" },
  { key: "rB", tt: "B", label: "Thu nhập tính thuế TNDN", kind: "calc", calcKey: "thuNhapTinhThue", strong: true, note: "LN trước thuế + CP không trừ − TN miễn − lỗ chuyển" },
  { key: "rRate", label: "Thuế suất TNDN", kind: "rate", note: "Bậc thang theo doanh thu lũy kế" },
  { key: "rThue", tt: "16", label: "Thuế TNDN hiện hành phải nộp", kind: "calc", calcKey: "thueTNDN", strong: true },
  { key: "rLnST", tt: "17", label: "Lợi nhuận sau thuế", kind: "calc", calcKey: "lnSauThue", strong: true },
  { key: "sec2", label: "Nghĩa vụ ngân sách khác (nhập tay)", kind: "section" },
  { key: "iTNCN", label: "Thuế TNCN phải nộp", kind: "input", inputKey: "thueTNCN" },
  { key: "iBhxh", label: "Bảo hiểm xã hội (3383)", kind: "input", inputKey: "bhxh3383" },
  { key: "iBhyt", label: "Bảo hiểm y tế (3384)", kind: "input", inputKey: "bhyt3384" },
  { key: "iBhtn", label: "Bảo hiểm thất nghiệp (3386)", kind: "input", inputKey: "bhtn3386" },
];

const BaoCaoTNDNPage: React.FC = () => {
  const { canEdit } = usePagePermission("/thue/bao-cao-tndn");
  const [nam, setNam] = useState<number>(dayjs().year());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bao, setBao] = useState<BaoCaoTNDN | null>(null);
  const [dc, setDc] = useState<DieuChinhThue | null>(null);

  const fetchData = async (namArg = nam) => {
    setLoading(true);
    try {
      const [b, d] = await Promise.all([
        taxReportService.getBaoCaoTNDN(namArg),
        taxReportService.getDieuChinh(namArg),
      ]);
      setBao(b);
      setDc(d);
    } catch {
      message.error("Không thể tải báo cáo TNDN");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field: InputKey, qi: number, val: number | null) => {
    if (!dc) return;
    const arr = [...((dc[field] as number[]) || [0, 0, 0, 0])];
    arr[qi] = val || 0;
    setDc({ ...dc, [field]: arr });
  };

  const handleSave = async () => {
    if (!dc) return;
    setSaving(true);
    try {
      await taxReportService.putDieuChinh(nam, dc);
      message.success("Đã lưu điều chỉnh và tính lại báo cáo");
      await fetchData(nam);
    } catch {
      message.error("Lưu điều chỉnh thất bại");
    } finally {
      setSaving(false);
    }
  };

  const calcCell = (row: RowDef, qi: number): number =>
    bao?.quy?.[qi]?.[row.calcKey as CalcKey] != null
      ? Number(bao.quy[qi][row.calcKey as CalcKey])
      : 0;

  const calcLuyKe = (row: RowDef): number =>
    bao?.luyKe?.[row.calcKey as CalcKey] != null
      ? Number(bao.luyKe[row.calcKey as CalcKey])
      : 0;

  const renderQuarter = (row: RowDef, qi: number) => {
    if (row.kind === "section") return null;
    if (row.kind === "calc") {
      const v = calcCell(row, qi);
      return row.strong ? <Text strong>{fmt(v)}</Text> : fmt(v);
    }
    if (row.kind === "rate") {
      const r = bao?.quy?.[qi]?.thueSuat ?? 0;
      return `${Math.round(r * 100)}%`;
    }
    // input
    const arr = (dc?.[row.inputKey as InputKey] as number[]) || [0, 0, 0, 0];
    const nhomIdx = NHOM_INDEX[row.inputKey as string];
    const autoTotal =
      nhomIdx !== undefined
        ? (bao?.quy?.[qi]?.cpKhongTruAuto?.[nhomIdx] ?? 0)
        : null;
    return (
      <div>
        <InputNumber
          size="small"
          value={arr[qi]}
          disabled={!canEdit}
          onChange={(val) => handleInputChange(row.inputKey as InputKey, qi, val)}
          style={{ width: "100%" }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(v) => Number((v || "").replace(/,/g, ""))}
          controls={false}
        />
        {autoTotal !== null && (
          <div style={autoTotalStyle} title={`Tổng gồm tự tính: ${fmt(autoTotal)}`}>
            Tổng: {fmt(autoTotal)}
          </div>
        )}
      </div>
    );
  };

  const renderLuyKe = (row: RowDef) => {
    if (row.kind === "section") return null;
    if (row.kind === "calc") {
      const v = calcLuyKe(row);
      return row.strong ? <Text strong>{fmt(v)}</Text> : fmt(v);
    }
    if (row.kind === "rate") {
      const r = bao?.luyKe?.thueSuat ?? 0;
      return `${Math.round(r * 100)}%`;
    }
    const arr = (dc?.[row.inputKey as InputKey] as number[]) || [0, 0, 0, 0];
    const nhomIdxLK = NHOM_INDEX[row.inputKey as string];
    const autoTotalLK =
      nhomIdxLK !== undefined
        ? (bao?.luyKe?.cpKhongTruAuto?.[nhomIdxLK] ?? 0)
        : null;
    const sumManual = arr.reduce((s, x) => s + (x || 0), 0);
    return (
      <div style={{ textAlign: "right" }}>
        <Text strong>{fmt(sumManual)}</Text>
        {autoTotalLK !== null && (
          <div style={autoTotalStyle} title={`Tổng gồm tự tính: ${fmt(autoTotalLK)}`}>
            Tổng: {fmt(autoTotalLK)}
          </div>
        )}
      </div>
    );
  };

  // Lọc theo cột ở header + cố định cột. Bảng có dòng tiêu đề nhóm (kind: 'section') nên
  // việc lọc do `filterTndnRows` lo (ẩn luôn tiêu đề nhóm khi nhóm rỗng).
  const { filterable, filters, hasPinned } = useTableColumnFilters("thue-bao-cao-tndn");
  const viewRows = useMemo(() => filterTndnRows(ROWS, filters), [filters]);

  const quarterCol = (qi: number) => ({
    title: `Quý ${qi + 1}`,
    key: `q${qi}`,
    width: 160,
    align: "right" as const,
    onCell: (row: RowDef) =>
      row.kind === "section" ? { colSpan: 0 } : {},
    render: (_: unknown, row: RowDef) => renderQuarter(row, qi),
  });

  const columns = [
    {
      title: "TT",
      dataIndex: "tt",
      key: "tt",
      width: 44,
      align: "center" as const,
      onCell: (row: RowDef) =>
        row.kind === "section" ? { colSpan: 0 } : {},
    },
    filterable<RowDef>({
      title: "Chỉ tiêu",
      dataIndex: "label",
      key: "label",
      width: 280,
      onCell: (row: RowDef) =>
        row.kind === "section" ? { colSpan: 7 } : {},
      render: (v: string, row: RowDef) => {
        if (row.kind === "section")
          return <Text strong className="text-primary">{v}</Text>;
        return row.strong ? <Text strong>{v}</Text> : v;
      },
    }),
    quarterCol(0),
    quarterCol(1),
    quarterCol(2),
    quarterCol(3),
    {
      title: "Lũy kế",
      key: "luyKe",
      width: 170,
      align: "right" as const,
      onCell: (row: RowDef) =>
        row.kind === "section" ? { colSpan: 0 } : {},
      render: (_: unknown, row: RowDef) => renderLuyKe(row),
    },
    filterable<RowDef>({
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 220,
      onCell: (row: RowDef) =>
        row.kind === "section" ? { colSpan: 0 } : {},
      render: (v?: string) => (v ? <Text type="secondary">{v}</Text> : null),
    }),
  ];

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Thuế" },
          { title: "Báo cáo nhanh thuế TNDN" },
        ]}
      />

      <Card>
        <Space className="mb-4" wrap>
          <Title level={5} className="!mb-0">
            Báo cáo nhanh thuế TNDN
          </Title>
          <Text strong>Năm:</Text>
          <InputNumber
            value={nam}
            onChange={(v) => {
              const y = v || dayjs().year();
              setNam(y);
              fetchData(y);
            }}
            style={{ width: 110 }}
          />
          <Tag color="blue">Doanh thu lũy kế: {fmt(bao?.luyKe?.doanhThuLuyKe)}</Tag>
          {canEdit && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              Lưu & tính lại
            </Button>
          )}
        </Space>

        <Table
          columns={columns}
          dataSource={viewRows}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
          // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được.
          scroll={{ x: hasPinned ? "max-content" : 1240, y: "calc(100vh - 280px)" }}
        />
      </Card>
    </div>
  );
};

export default BaoCaoTNDNPage;
