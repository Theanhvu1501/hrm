// fe/src/pages/bao-cao/bang-can-doi/bangCanDoiExport.ts
import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { BalanceSheetData, BalanceSheetItem } from "@/services/balanceSheetService";

const COLUMNS: ReportCol[] = [
  { key: "tenChiTieu", header: "Chỉ tiêu", width: 45 },
  { key: "ma", header: "Mã số", width: 10, align: "center" },
  { key: "dauNam", header: "Số đầu năm", numFmt: NUM_FMT, width: 18 },
  { key: "cuoiKy", header: "Số cuối kỳ", numFmt: NUM_FMT, width: 18 },
  { key: "chenhLech", header: "Chênh lệch", numFmt: NUM_FMT, width: 16 },
];

function itemRows(items: BalanceSheetItem[]): ReportRow[] {
  return items.map((it) => ({
    cells: {
      tenChiTieu: it.tenChiTieu, ma: it.ma,
      dauNam: it.dauNam, cuoiKy: it.cuoiKy,
      chenhLech: it.cuoiKy - it.dauNam,
    },
    bold: Boolean(it.isSection || it.isTotal),
    indent: it.level,
  }));
}

export function buildBangCanDoiSheets(activeTab: string, data: BalanceSheetData | null): ReportSheet[] {
  if (activeTab !== "1" || !data) return [];
  const rows: ReportRow[] = [];
  rows.push({ section: "TÀI SẢN" });
  rows.push(...itemRows(data.taiSan));
  rows.push({ cells: { tenChiTieu: "TỔNG CỘNG TÀI SẢN", ma: "", dauNam: data.tongTaiSan.dauNam ?? 0, cuoiKy: data.tongTaiSan.cuoiKy, chenhLech: data.tongTaiSan.cuoiKy - (data.tongTaiSan.dauNam ?? 0) }, bold: true, fill: "total" });
  rows.push({ spacer: true });
  rows.push({ section: "NGUỒN VỐN" });
  rows.push(...itemRows(data.nguonVon));
  rows.push({ cells: { tenChiTieu: "TỔNG CỘNG NGUỒN VỐN", ma: "", dauNam: data.tongNguonVon.dauNam ?? 0, cuoiKy: data.tongNguonVon.cuoiKy, chenhLech: data.tongNguonVon.cuoiKy - (data.tongNguonVon.dauNam ?? 0) }, bold: true, fill: "total" });
  return [{ name: "Cân đối kế toán", title: "BẢNG CÂN ĐỐI KẾ TOÁN", columns: COLUMNS, rows }];
}
