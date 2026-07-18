import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { SoChiTietReport } from "@/services/soChiTietTaiKhoanService";
import { REGISTRY, buildDisplayRows, type ColumnDef, type DisplayRow } from "./columnRegistry";

const NUMERIC_KEYS = new Set(["phatSinhNo", "phatSinhCo", "soDuNo", "soDuCo"]);

function toReportCol(c: ColumnDef): ReportCol {
  return {
    key: c.dataIndex,
    header: c.title,
    width: c.width ? Math.round(c.width / 8) : 15,
    align: c.align,
    numFmt: NUMERIC_KEYS.has(c.key) ? NUM_FMT : undefined,
  };
}

// Gộp cột liền kề cùng parentHeader (giống buildAntdColumns).
function buildColumns(visibleKeys: string[]): ReportCol[] {
  const visible = REGISTRY.filter((c) => visibleKeys.includes(c.key));
  const cols: ReportCol[] = [];
  let i = 0;
  while (i < visible.length) {
    const c = visible[i];
    if (!c.parentHeader) { cols.push(toReportCol(c)); i += 1; continue; }
    const header = c.parentHeader;
    const children: ReportCol[] = [];
    while (i < visible.length && visible[i].parentHeader === header) {
      children.push(toReportCol(visible[i]));
      i += 1;
    }
    cols.push({ key: header, header, children });
  }
  return cols;
}

function rowCells(r: DisplayRow): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const def of REGISTRY) {
    const v = (r as unknown as Record<string, unknown>)[def.dataIndex];
    out[def.dataIndex] = typeof v === "number" || typeof v === "string" ? v : null;
  }
  return out;
}

export function buildSoChiTietSheets(
  reports: SoChiTietReport[],
  visibleKeys: string[],
  from: string,
  to: string,
): ReportSheet[] {
  if (!reports.length) return [];
  const columns = buildColumns(visibleKeys);
  const rows: ReportRow[] = [];
  reports.forEach((rep, idx) => {
    const dt = rep.doiTuong ? ` | Đối tượng: ${rep.doiTuong.ma} - ${rep.doiTuong.ten}` : "";
    if (idx > 0) rows.push({ spacer: true }); // dòng trống ngăn cách khối (từ khối 2)
    rows.push({ section: `Tài khoản: ${rep.taiKhoan.ma} - ${rep.taiKhoan.ten}${dt}` });
    for (const dr of buildDisplayRows(rep)) {
      rows.push({ cells: rowCells(dr), bold: dr.kind !== "entry" });
    }
  });
  return [
    {
      name: "Sổ chi tiết tài khoản",
      title: "SỔ CHI TIẾT TÀI KHOẢN",
      meta: [`Từ ngày ${from} đến ngày ${to}`],
      columns,
      rows,
    },
  ];
}
