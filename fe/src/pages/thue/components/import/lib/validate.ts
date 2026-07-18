import { extractCode, normalizeAmount, normalizeDate } from "@/utils/excel-import";
import { THUE_SUAT_OPTIONS, ThueSuat } from "@/services/taxService";
import {
  BangKeImportItem,
  BangKeVariant,
  ImportColumnKey,
  RawImportRow,
  RowError,
  RowValidationResult,
  ValidateResult,
  buildColumns,
} from "./columns";
import { buildHoaDonKey } from "./duplicates";

const THUE_SUAT_VALUES = THUE_SUAT_OPTIONS.map((o) => o.value);

/** Lệch quá mức này so với công thức thì cảnh báo; dưới ngưỡng coi như chênh lệch làm tròn. */
const LECH_WARN_THRESHOLD = 1000;

const THUE_RATE: Record<string, number> = {
  "0": 0,
  "5": 0.05,
  "8": 0.08,
  "10": 0.1,
  KCT: 0,
  KKKT: 0,
};

const fmtVnd = (n: number): string => new Intl.NumberFormat("vi-VN").format(n);

/** MST hợp lệ: 10 chữ số (đơn vị) hoặc 13 chữ số (đơn vị + chi nhánh). */
function isValidMst(raw: string): boolean {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{10}$/.test(digits) || /^\d{13}$/.test(digits);
}

const asText = (v: string | number | undefined): string =>
  typeof v === "number" ? String(v) : (v ?? "").trim();

export function validateRows(
  rows: RawImportRow[],
  variant: BangKeVariant,
): ValidateResult {
  const columns = buildColumns(variant);
  const labelOf = (key: ImportColumnKey) =>
    columns.find((c) => c.key === key)?.header ?? key;

  const results: RowValidationResult[] = rows.map((row) => {
    const errors: RowError[] = [];
    const warnings: RowError[] = [];
    const err = (field: ImportColumnKey, message: string) =>
      errors.push({ field, message: `${labelOf(field)}: ${message}` });

    // Bắt buộc
    for (const col of columns) {
      if (col.required && asText(row[col.key]) === "") {
        err(col.key, "bắt buộc, không được để trống");
      }
    }

    // Ngày hóa đơn
    const ngayHoaDon = normalizeDate(row.ngayHoaDon);
    if (asText(row.ngayHoaDon) !== "" && !ngayHoaDon) {
      err("ngayHoaDon", "sai định dạng, dùng DD/MM/YYYY");
    }

    // Giá trị chưa thuế — truyền thẳng number, đừng qua chuỗi (mất phần thập phân)
    const giaTri = normalizeAmount(row.giaTriChuaThue);
    if (asText(row.giaTriChuaThue) !== "") {
      if (giaTri === null) err("giaTriChuaThue", "không phải là số");
      else if (giaTri < 0) err("giaTriChuaThue", "không được là số âm");
    }

    // Thuế suất
    const thueSuat = extractCode(asText(row.thueSuat)).toUpperCase() as ThueSuat;
    if (asText(row.thueSuat) !== "" && !THUE_SUAT_VALUES.includes(thueSuat)) {
      err("thueSuat", `phải là một trong ${THUE_SUAT_VALUES.join(", ")}`);
    }

    // Tiền thuế / Tổng thanh toán — nhập tay được; bỏ trống thì BE tính theo công thức.
    const tienThue = normalizeAmount(row.tienThue);
    if (asText(row.tienThue) !== "") {
      if (tienThue === null) err("tienThue", "không phải là số");
      else if (tienThue < 0) err("tienThue", "không được là số âm");
    }

    const tongThanhToan = normalizeAmount(row.tongThanhToan);
    if (asText(row.tongThanhToan) !== "") {
      if (tongThanhToan === null) err("tongThanhToan", "không phải là số");
      else if (tongThanhToan < 0) err("tongThanhToan", "không được là số âm");
    }

    // Cảnh báo lệch công thức (không chặn): bắt lỗi gõ nhầm chữ số, bỏ qua chênh lệch làm tròn.
    if (
      tienThue !== null &&
      tienThue >= 0 &&
      giaTri !== null &&
      THUE_RATE[thueSuat] !== undefined
    ) {
      const theoCongThuc = Math.round(giaTri * THUE_RATE[thueSuat]);
      const lech = Math.abs(tienThue - theoCongThuc);
      if (lech > LECH_WARN_THRESHOLD) {
        warnings.push({
          field: "tienThue",
          message: `${labelOf("tienThue")}: lệch ${fmtVnd(lech)} đ so với công thức (${fmtVnd(theoCongThuc)} đ)`,
        });
      }
    }

    // MST — chỉ cảnh báo
    const mst = asText(row.mst);
    if (mst !== "" && !isValidMst(mst)) {
      warnings.push({
        field: "mst",
        message: `${labelOf("mst")}: không phải 10 hoặc 13 chữ số`,
      });
    }

    const soHoaDon = asText(row.soHoaDon);
    const kyHieuHoaDon = asText(row.kyHieuHoaDon);
    const key = soHoaDon ? buildHoaDonKey(soHoaDon, kyHieuHoaDon, mst) : "";

    if (errors.length > 0) {
      return { rowNumber: row.rowNumber, errors, warnings, item: null, key };
    }

    const ten = asText(row.ten);
    const item: BangKeImportItem = {
      ngayHoaDon: ngayHoaDon as string,
      soHoaDon,
      giaTriChuaThue: giaTri as number,
      thueSuat,
      ...(tienThue !== null ? { tienThue } : {}),
      ...(tongThanhToan !== null ? { tongThanhToan } : {}),
      ...(kyHieuHoaDon ? { kyHieuHoaDon } : {}),
      ...(asText(row.tenHangHoa) ? { tenHangHoa: asText(row.tenHangHoa) } : {}),
      ...(asText(row.ghiChu) ? { ghiChu: asText(row.ghiChu) } : {}),
      ...(variant === "mua"
        ? { tenNguoiBan: ten, ...(mst ? { mstNguoiBan: mst } : {}) }
        : { tenNguoiMua: ten, ...(mst ? { mstNguoiMua: mst } : {}) }),
    };

    return { rowNumber: row.rowNumber, errors, warnings, item, key };
  });

  const hasErrors = results.some((r) => r.errors.length > 0);
  return {
    results,
    validItems: results.map((r) => r.item).filter((i): i is BangKeImportItem => i !== null),
    hasErrors,
  };
}
