import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { PnLGroupedData, PnLItem, PnLSummary } from "@/services/pnlService";

const COLUMNS: ReportCol[] = [
  { key: "khoanMuc", header: "Khoản mục", width: 42 },
  { key: "soTien", header: "Số tiền", numFmt: NUM_FMT, width: 20 },
];

export function buildPnLSheets(
  groupedData: PnLGroupedData[],
  summary: PnLSummary | null,
  periodLabel: string,
): ReportSheet[] {
  if (!groupedData.length && !summary) return [];
  const rows: ReportRow[] = [];
  for (const group of groupedData) {
    rows.push({ cells: { khoanMuc: group.category.name, soTien: group.subtotal }, bold: true, fill: "category" });
    group.items.forEach((item: PnLItem) => {
      rows.push({ cells: { khoanMuc: `${item.ma} - ${item.ten}`, soTien: item.soTien }, indent: 1 });
    });
  }
  rows.push({ cells: { khoanMuc: "LỢI NHUẬN TRƯỚC THUẾ", soTien: summary?.loiNhuanTruocThue ?? 0 }, bold: true, fill: "total" });
  rows.push({ cells: { khoanMuc: "Thuế TNDN (20%)", soTien: -(summary?.thue ?? 0) }, indent: 1 });
  rows.push({ cells: { khoanMuc: "LỢI NHUẬN SAU THUẾ", soTien: summary?.loiNhuanSauThue ?? 0 }, bold: true, fill: "total" });
  return [
    {
      name: "Lãi lỗ (P&L)",
      title: "BÁO CÁO LÃI LỖ (P&L)",
      meta: [`Kỳ: ${periodLabel}`],
      columns: COLUMNS,
      rows,
    },
  ];
}
