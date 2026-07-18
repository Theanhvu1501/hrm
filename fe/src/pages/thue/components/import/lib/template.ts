import * as ExcelJS from "exceljs";
import { THUE_SUAT_OPTIONS } from "@/services/taxService";
import {
  BangKeVariant,
  ImportColumnKey,
  THUE_SUAT_SHEET,
  buildColumns,
} from "./columns";

/** Số dòng dữ liệu áp dropdown ở sheet chính (hàng 2 → MAX_DATA_ROWS+1). */
const MAX_DATA_ROWS = 500;

const SHEET_NAME: Record<BangKeVariant, string> = {
  mua: "BangKeMuaVao",
  ban: "BangKeBanRa",
};

const FILE_NAME: Record<BangKeVariant, string> = {
  mua: "mau-import-bang-ke-mua-vao",
  ban: "mau-import-bang-ke-ban-ra",
};

/** Dòng ví dụ minh họa định dạng ngày và thuế suất. */
const EXAMPLE_ROW: Record<BangKeVariant, Partial<Record<ImportColumnKey, string>>> = {
  mua: {
    ngayHoaDon: "01/06/2026",
    soHoaDon: "0000123",
    kyHieuHoaDon: "1C25TAA",
    ten: "Công ty TNHH ABC",
    mst: "0101243150",
    tenHangHoa: "Văn phòng phẩm",
    giaTriChuaThue: "10000000",
    thueSuat: "10 - 10%",
    tienThue: "1000000",
    tongThanhToan: "11000000",
  },
  ban: {
    ngayHoaDon: "01/06/2026",
    soHoaDon: "0000123",
    kyHieuHoaDon: "1C25TAA",
    ten: "Công ty CP XYZ",
    mst: "0101243150",
    tenHangHoa: "Dịch vụ tư vấn",
    giaTriChuaThue: "10000000",
    thueSuat: "10 - 10%",
    tienThue: "1000000",
    tongThanhToan: "11000000",
  },
};

/** Dựng workbook template (đồng bộ, test được). */
export function buildTemplateWorkbook(variant: BangKeVariant): ExcelJS.Workbook {
  const columns = buildColumns(variant);
  const wb = new ExcelJS.Workbook();

  const main = wb.addWorksheet(SHEET_NAME[variant]);
  main.addRow(columns.map((c) => c.header));
  main.addRow(columns.map((c) => EXAMPLE_ROW[variant][c.key] ?? ""));

  // Sheet danh mục thuế suất: cột A = "Mã - Tên", bắt đầu từ hàng 1 (không header)
  const ref = wb.addWorksheet(THUE_SUAT_SHEET);
  for (const o of THUE_SUAT_OPTIONS) ref.addRow([`${o.value} - ${o.label}`]);

  // Dropdown cho cột Thuế suất
  const colNumber = columns.findIndex((c) => c.key === "thueSuat") + 1;
  const formula = `'${THUE_SUAT_SHEET}'!$A$1:$A$${THUE_SUAT_OPTIONS.length}`;
  for (let r = 2; r <= MAX_DATA_ROWS + 1; r++) {
    main.getCell(r, colNumber).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [formula],
    };
  }

  return wb;
}

/** Tạo và tải file mẫu .xlsx. */
export async function downloadTemplate(variant: BangKeVariant): Promise<void> {
  const wb = buildTemplateWorkbook(variant);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${FILE_NAME[variant]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
