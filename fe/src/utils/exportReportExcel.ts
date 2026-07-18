import * as ExcelJS from "exceljs";

export interface ReportCol {
  key: string;
  header: string;
  children?: ReportCol[];
  width?: number;
  align?: "left" | "right" | "center";
  numFmt?: string;
}

export interface ReportRow {
  cells?: Record<string, string | number | null | undefined>;
  bold?: boolean;
  indent?: number;
  fill?: "total" | "group" | "category";
  section?: string;
  spacer?: boolean;
}

export interface ReportSheet {
  name: string;
  title: string;
  meta?: string[];
  columns: ReportCol[];
  rows: ReportRow[];
}

// Số: phân cách nghìn, âm trong ngoặc, 0/rỗng -> "-"
export const NUM_FMT = '#,##0;(#,##0);"-"';
// Phần trăm: 1 chữ số thập phân, âm trong ngoặc, 0/rỗng -> "-"
export const PCT_FMT = '0.0"%";(0.0"%");"-"';

export function leafCols(columns: ReportCol[]): ReportCol[] {
  const out: ReportCol[] = [];
  for (const c of columns) {
    if (c.children && c.children.length) out.push(...leafCols(c.children));
    else out.push(c);
  }
  return out;
}

export function headerDepth(columns: ReportCol[]): 1 | 2 {
  return columns.some((c) => c.children && c.children.length) ? 2 : 1;
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim();
  return (cleaned || "Sheet").slice(0, 31);
}

const FILL: Record<string, string> = {
  total: "FFE6F7FF",
  group: "FFFFF7E6",
  category: "FFFAFAFA",
  header: "FFF0F0F0",
};

const solid = (argb: string): ExcelJS.Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});

const THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD9D9D9" } },
  left: { style: "thin", color: { argb: "FFD9D9D9" } },
  bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
  right: { style: "thin", color: { argb: "FFD9D9D9" } },
};

function styleHeader(
  ws: ExcelJS.Worksheet,
  rows: ExcelJS.Row[],
  nCols: number,
): void {
  for (const r of rows) {
    for (let i = 1; i <= nCols; i++) {
      const cell = r.getCell(i);
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = solid(FILL.header);
      cell.border = THIN;
    }
  }
}

function writeSheet(ws: ExcelJS.Worksheet, sheet: ReportSheet): void {
  const leaves = leafCols(sheet.columns);
  const nCols = Math.max(leaves.length, 1);
  const depth = headerDepth(sheet.columns);

  // Tiêu đề lớn
  const titleRow = ws.addRow([sheet.title]);
  titleRow.font = { bold: true, size: 14 };
  ws.mergeCells(titleRow.number, 1, titleRow.number, nCols);
  titleRow.getCell(1).alignment = { horizontal: "center" };

  // Meta
  for (const line of sheet.meta ?? []) {
    const r = ws.addRow([line]);
    ws.mergeCells(r.number, 1, r.number, nCols);
    r.getCell(1).font = { italic: true, size: 10 };
  }
  ws.addRow([]); // ngăn cách trước header

  // Header 1 hoặc 2 tầng
  if (depth === 2) {
    const top = ws.addRow([]);
    const bottom = ws.addRow([]);
    let col = 1;
    for (const c of sheet.columns) {
      if (c.children && c.children.length) {
        ws.mergeCells(top.number, col, top.number, col + c.children.length - 1);
        top.getCell(col).value = c.header;
        for (const child of c.children) {
          bottom.getCell(col).value = child.header;
          col += 1;
        }
      } else {
        ws.mergeCells(top.number, col, bottom.number, col);
        top.getCell(col).value = c.header;
        col += 1;
      }
    }
    styleHeader(ws, [top, bottom], nCols);
  } else {
    const hr = ws.addRow(leaves.map((c) => c.header));
    styleHeader(ws, [hr], nCols);
  }
  const freezeTo = ws.rowCount;

  // Dòng dữ liệu
  for (const row of sheet.rows) {
    if (row.spacer) {
      ws.addRow([]);
      continue;
    }
    if (row.section) {
      const r = ws.addRow([row.section]);
      ws.mergeCells(r.number, 1, r.number, nCols);
      r.getCell(1).font = { bold: true };
      r.getCell(1).fill = solid(FILL.group);
      continue;
    }
    const values = leaves.map((c) => {
      const v = row.cells?.[c.key];
      return v === undefined ? null : v;
    });
    const r = ws.addRow(values);
    leaves.forEach((c, idx) => {
      const cell = r.getCell(idx + 1);
      cell.border = THIN;
      if (c.numFmt) {
        cell.numFmt = c.numFmt;
        cell.alignment = { horizontal: "right" };
      } else if (c.align) {
        cell.alignment = { horizontal: c.align };
      }
      if (idx === 0 && row.indent) {
        cell.alignment = { ...(cell.alignment ?? {}), indent: row.indent };
      }
      if (row.bold) cell.font = { ...(cell.font ?? {}), bold: true };
      if (row.fill) cell.fill = solid(FILL[row.fill]);
    });
  }

  // Độ rộng cột
  leaves.forEach((c, idx) => {
    ws.getColumn(idx + 1).width = c.width ?? 15;
  });

  ws.views = [{ state: "frozen", ySplit: freezeTo }];
}

/** Dựng workbook từ mô hình (không đụng DOM) — tách riêng để test được. */
export function buildReportWorkbook(sheets: ReportSheet[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sanitizeSheetName(sheet.name));
    writeSheet(ws, sheet);
  }
  return wb;
}

export async function exportReportExcel(
  fileName: string,
  sheets: ReportSheet[],
): Promise<void> {
  const wb = buildReportWorkbook(sheets);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
