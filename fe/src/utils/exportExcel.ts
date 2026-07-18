import * as XLSX from "xlsx";

export interface ExcelColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface ExportExcelOptions {
  title: string;
  columns: ExcelColumn[];
  data: Record<string, string | number | undefined | null>[];
  fileName: string;
  sheetName?: string;
}

export function exportToExcel(options: ExportExcelOptions): void {
  const { title, columns, data, fileName, sheetName = "Sheet1" } = options;

  // Build header row
  const headers = columns.map((col) => col.header);

  // Build data rows
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = row[col.dataKey];
      if (val === null || val === undefined) return "";
      return val;
    })
  );

  // Create worksheet with title + header + data
  const wsData = [[title], [], headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Merge title row across all columns
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
  ];

  // Set column widths
  ws["!cols"] = columns.map((col) => ({
    wch: col.width ?? 15,
  }));

  // Create workbook and export
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
