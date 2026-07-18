import {
  DoiTuong,
  DuAn,
  BoPhan,
  SanPham,
  DongTien,
  NhomKhuyenMai,
  NhomQuanLy,
  HopDong,
  KhoanMuc,
} from "@/types";
import { CreatePhieuDto } from "@/services/phieuService";
import {
  RawImportRow,
  RowError,
  RowValidationResult,
  ValidateResult,
  IMPORT_COLUMNS,
  CODE_COLUMN_KEYS,
} from "./columns";
import { extractCode } from "./extractCode";
import { normalizeAmount, normalizeDate } from "./normalize";
import {
  buildDanhMucFromResolved,
  ResolvedRow,
} from "./buildDanhMucFromRow";

export interface ImportMasterData {
  doiTuongList: DoiTuong[];
  duAnList: DuAn[];
  boPhanList: BoPhan[];
  sanPhamList: SanPham[];
  dongTienList: DongTien[];
  khoanMucList: KhoanMuc[];
  hopDongList: HopDong[];
  nhomKhuyenMaiList: NhomKhuyenMai[];
  nhomQuanLyList: NhomQuanLy[];
}

const labelOf = (key: string) =>
  IMPORT_COLUMNS.find((c) => c.key === key)?.header ?? key;

export function validateAndBuild(
  rows: RawImportRow[],
  md: ImportMasterData,
): ValidateResult {
  const results: RowValidationResult[] = rows.map((row) =>
    validateRow(row, md),
  );
  const validItems = results
    .map((r) => r.item)
    .filter((i): i is CreatePhieuDto => i !== null);
  const hasErrors = results.some((r) => r.errors.length > 0);
  return { results, validItems, hasErrors };
}

function validateRow(
  rawRow: RawImportRow,
  md: ImportMasterData,
): RowValidationResult {
  // Tách mã từ dạng "Mã - Tên" cho các cột danh mục (hỗ trợ cả dropdown lẫn gõ mã thuần)
  const row: RawImportRow = { ...rawRow };
  for (const key of CODE_COLUMN_KEYS) {
    if (row[key] != null) row[key] = extractCode(row[key]);
  }

  const errors: RowError[] = [];
  const warnings: RowError[] = [];

  // 1. Bắt buộc
  IMPORT_COLUMNS.filter((c) => c.required).forEach((c) => {
    if (!row[c.key] || String(row[c.key]).trim() === "") {
      errors.push({ field: c.key, message: `${c.header} không được trống` });
    }
  });

  // 2. Ngày
  const ngay = normalizeDate(row.ngay);
  if (row.ngay && !ngay) {
    errors.push({ field: "ngay", message: "Ngày sai định dạng (DD/MM/YYYY)" });
  }

  // 3. Số tiền
  const soTien = normalizeAmount(row.soTien);
  if (row.soTien && (soTien === null || soTien <= 0)) {
    errors.push({ field: "soTien", message: "Số tiền phải là số > 0" });
  }

  // 4. Các chiều phân bổ (chỉ kiểm khi có điền)
  const doiTuong = resolveOptional(
    row.doiTuong,
    md.doiTuongList,
    "ma",
    errors,
    "doiTuong",
  );
  const doiTuong2 = resolveOptional(
    row.doiTuong2,
    md.doiTuongList,
    "ma",
    errors,
    "doiTuong2",
  );
  const duAn = resolveOptional(
    row.duAn,
    md.duAnList,
    "ma",
    errors,
    "duAn",
  );
  const boPhan = resolveOptional(
    row.boPhan,
    md.boPhanList,
    "ma",
    errors,
    "boPhan",
  );
  const doi = resolveOptional(
    row.doi,
    md.boPhanList,
    "ma",
    errors,
    "doi",
  );
  const nhanVien = resolveOptional(
    row.nhanVien,
    md.doiTuongList,
    "ma",
    errors,
    "nhanVien",
  );
  const sanPham = resolveOptional(
    row.sanPham,
    md.sanPhamList,
    "ma",
    errors,
    "sanPham",
  );
  const dongTien = resolveOptional(
    row.dongTien,
    md.dongTienList,
    "ma",
    errors,
    "dongTien",
  );
  const khoanMuc = resolveOptional(
    row.khoanMuc,
    md.khoanMucList,
    "ma",
    errors,
    "khoanMuc",
  );
  const hopDong = resolveOptional(
    row.hopDong,
    md.hopDongList,
    "soHopDong",
    errors,
    "hopDong",
  );
  const nhomKhuyenMai = resolveOptional(
    row.nhomKhuyenMai,
    md.nhomKhuyenMaiList,
    "ma",
    errors,
    "nhomKhuyenMai",
  );
  const nhomQuanLy = resolveOptional(
    row.nhomQuanLy,
    md.nhomQuanLyList,
    "ma",
    errors,
    "nhomQuanLy",
  );

  if (errors.length > 0) {
    return { rowNumber: row.rowNumber, errors, warnings, item: null };
  }

  // Dựng item (đã chắc chắn các trường bắt buộc hợp lệ)
  const resolved: ResolvedRow = {
    doiTuong,
    doiTuong2,
    duAn,
    boPhan,
    doi,
    nhanVien,
    sanPham,
    dongTien,
    khoanMuc,
    hopDong,
    nhomKhuyenMai,
    nhomQuanLy,
  };

  const item: CreatePhieuDto = {
    ngay: ngay as string,
    soTien: soTien as number,
    noiDung: row.noiDung || "",
    nguoiGiaoDich: row.nguoiGiaoDich,
    diaChi: row.diaChi,
    ghiChu: row.ghiChu,
    danhMuc: buildDanhMucFromResolved(resolved),
  };

  return { rowNumber: row.rowNumber, errors, warnings, item };
}

/** Tìm bản ghi theo field khóa; nếu có điền mã mà không tìm thấy thì push lỗi. */
function resolveOptional<T>(
  code: string | undefined,
  list: T[],
  keyField: keyof T,
  errors: RowError[],
  fieldName: string,
): T | undefined {
  if (!code || code.trim() === "") return undefined;
  const found = list.find((x) => String(x[keyField]) === code);
  if (!found) {
    errors.push({
      field: fieldName,
      message: `${labelOf(fieldName)} '${code}' không tồn tại`,
    });
    return undefined;
  }
  return found;
}
