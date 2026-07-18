import * as ExcelJS from "exceljs";
import { IMPORT_COLUMNS, ImportColumnKey } from "./columns";
import { ImportMasterData } from "./validate";

/** Số dòng dữ liệu áp dropdown ở sheet chính (hàng 2 → MAX_DATA_ROWS+1). */
const MAX_DATA_ROWS = 500;

/** Định nghĩa các sheet danh mục (tên ASCII), cột A là chuỗi "Mã - Tên". */
interface RefSheet {
  name: string;
  items: (md: ImportMasterData) => string[];
}

const REF_SHEETS: RefSheet[] = [
  { name: "DM_DoiTuong", items: (md) => md.doiTuongList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_DuAn", items: (md) => md.duAnList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_BoPhan", items: (md) => md.boPhanList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_SanPham", items: (md) => md.sanPhamList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_DongTien", items: (md) => md.dongTienList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_KhoanMuc", items: (md) => md.khoanMucList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_HopDong", items: (md) => md.hopDongList.map((x) => `${x.soHopDong} - ${x.tenCongTrinh || ""}`) },
  { name: "DM_NhomKhuyenMai", items: (md) => md.nhomKhuyenMaiList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_NhomQuanLy", items: (md) => md.nhomQuanLyList.map((x) => `${x.ma} - ${x.ten}`) },
];

/** Cột sheet chính → sheet danh mục để gắn dropdown. */
const COLUMN_TO_SHEET: Partial<Record<ImportColumnKey, string>> = {
  doiTuong: "DM_DoiTuong",
  doiTuong2: "DM_DoiTuong",
  duAn: "DM_DuAn",
  boPhan: "DM_BoPhan",
  doi: "DM_BoPhan",
  nhanVien: "DM_DoiTuong",
  sanPham: "DM_SanPham",
  dongTien: "DM_DongTien",
  khoanMuc: "DM_KhoanMuc",
  hopDong: "DM_HopDong",
  nhomKhuyenMai: "DM_NhomKhuyenMai",
  nhomQuanLy: "DM_NhomQuanLy",
};

/** Giá trị ví dụ cho dòng mẫu (các cột không-danh-mục). */
const EXAMPLE_ROW: Partial<Record<ImportColumnKey, string>> = {
  ngay: "01/06/2026",
  soTien: "1000000",
  noiDung: "Ví dụ: thu tiền bán hàng",
};

/** Dựng workbook template (đồng bộ, test được). */
export function buildTemplateWorkbook(md: ImportMasterData): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();

  // Sheet chính
  const main = wb.addWorksheet("PhieuThuChi");
  main.addRow(IMPORT_COLUMNS.map((c) => c.header));
  main.addRow(IMPORT_COLUMNS.map((c) => EXAMPLE_ROW[c.key] ?? ""));

  // Sheet danh mục: cột A = "Mã - Tên", bắt đầu từ hàng 1 (không header)
  for (const ref of REF_SHEETS) {
    const ws = wb.addWorksheet(ref.name);
    for (const v of ref.items(md)) ws.addRow([v]);
  }

  // Gắn data validation (dropdown) cho các cột danh mục, hàng 2 → MAX_DATA_ROWS+1
  IMPORT_COLUMNS.forEach((col, idx) => {
    const sheetName = COLUMN_TO_SHEET[col.key];
    if (!sheetName) return;
    const refWs = wb.getWorksheet(sheetName);
    const endRow = Math.max(refWs ? refWs.rowCount : 0, 1);
    const formula = `'${sheetName}'!$A$1:$A$${endRow}`;
    const colNumber = idx + 1;
    for (let r = 2; r <= MAX_DATA_ROWS + 1; r++) {
      main.getCell(r, colNumber).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [formula],
      };
    }
  });

  return wb;
}

/** Tạo và tải file mẫu .xlsx. */
export async function downloadTemplate(
  md: ImportMasterData,
  fileName = "mau-import-phieu-thu-chi",
): Promise<void> {
  const wb = buildTemplateWorkbook(md);
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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
