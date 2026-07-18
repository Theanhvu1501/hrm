import {
  DoiTuong,
  DuAn,
  BoPhan,
  SanPham,
  DongTien,
  NhomKhuyenMai,
  NhomQuanLy,
  HopDong,
  LoaiGiaoDich,
  QuyChuan,
  KhoanMuc,
  TaiKhoanNganHang,
  DoiTuongSnapshot,
} from "@/types";
import {
  buildDoiTuongSnapshot,
  buildNganHangSnapshot,
} from "@/utils/snapshotBuilder";
import { CreateEntryDto } from "@/services/nhatKyChungService";
import { LoaiChungTu } from "@/types";
import {
  RawImportRow,
  RowError,
  RowValidationResult,
  ValidateResult,
  IMPORT_COLUMNS,
  CODE_COLUMN_KEYS,
} from "./columns";
import { extractCode, normalizeAmount, normalizeDate } from "@/utils/excel-import";
import {
  buildDanhMucFromResolved,
  TaiKhoanLite,
  ResolvedRow,
} from "./buildDanhMucFromRow";

export interface ImportMasterData {
  taiKhoanList: TaiKhoanLite[];
  loaiGiaoDichList: LoaiGiaoDich[];
  quyChuanList: QuyChuan[];
  doiTuongList: DoiTuong[];
  /** Danh mục Ngân hàng & Quỹ — nguồn đối tượng khi TK có chiTietTheo = NGAN_HANG_QUY */
  nganHangList: TaiKhoanNganHang[];
  duAnList: DuAn[];
  boPhanList: BoPhan[];
  sanPhamList: SanPham[];
  dongTienList: DongTien[];
  khoanMucList: KhoanMuc[];
  hopDongList: HopDong[];
  nhomKhuyenMaiList: NhomKhuyenMai[];
  nhomQuanLyList: NhomQuanLy[];
}

/** Suy loai PHIEU_THU/PHIEU_CHI từ mã loại giao dịch (giống submit.handler). */
function deriveLoai(loaiGiaoDich: string): LoaiChungTu {
  return loaiGiaoDich === "PHIEU_CHI" || loaiGiaoDich === "BAO_NO"
    ? "PHIEU_CHI"
    : "PHIEU_THU";
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
    .filter((i): i is CreateEntryDto => i !== null);
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

  // 2b. Ngày ghi sổ (optional)
  const ngayGhiSo = normalizeDate(row.ngayGhiSo);
  if (row.ngayGhiSo && !ngayGhiSo) {
    errors.push({ field: "ngayGhiSo", message: "Ngày ghi sổ sai định dạng (DD/MM/YYYY)" });
  }

  // 3. Số tiền
  const soTien = normalizeAmount(row.soTien);
  if (row.soTien && (soTien === null || soTien <= 0)) {
    errors.push({ field: "soTien", message: "Số tiền phải là số > 0" });
  }

  // 4. Loại giao dịch
  const lgd = md.loaiGiaoDichList.find((x) => x.ma === row.loaiGiaoDich);
  if (row.loaiGiaoDich && !lgd) {
    errors.push({
      field: "loaiGiaoDich",
      message: `Loại giao dịch '${row.loaiGiaoDich}' không tồn tại`,
    });
  }

  // 5. Nghiệp vụ (phải thuộc loại giao dịch)
  let quyChuan: QuyChuan | undefined;
  if (row.nghiepVu) {
    quyChuan = md.quyChuanList.find(
      (q) =>
        q.nghiepVu === row.nghiepVu && q.loaiGiaoDich === row.loaiGiaoDich,
    );
    if (!quyChuan) {
      errors.push({
        field: "nghiepVu",
        message: `Nghiệp vụ '${row.nghiepVu}' không tồn tại hoặc không thuộc loại giao dịch '${row.loaiGiaoDich}'`,
      });
    }
  }

  // 6. TK Nợ / Có
  const tkNo = md.taiKhoanList.find((t) => t.ma === row.taiKhoanNo);
  if (row.taiKhoanNo && !tkNo) {
    errors.push({
      field: "taiKhoanNo",
      message: `TK Nợ '${row.taiKhoanNo}' không tồn tại`,
    });
  }
  const tkCo = md.taiKhoanList.find((t) => t.ma === row.taiKhoanCo);
  if (row.taiKhoanCo && !tkCo) {
    errors.push({
      field: "taiKhoanCo",
      message: `TK Có '${row.taiKhoanCo}' không tồn tại`,
    });
  }
  if (tkNo && tkCo && row.taiKhoanNo === row.taiKhoanCo) {
    warnings.push({ field: "taiKhoanCo", message: "TK Nợ và TK Có giống nhau" });
  }

  // 7. Các chiều phân bổ (chỉ kiểm khi có điền)
  // Đối tượng có thể là đối tượng thường (KH/NCC/…) hoặc ngân hàng & quỹ
  // (khi TK khai chiTietTheo = NGAN_HANG_QUY) — giống lúc nhập tay.
  const doiTuong = resolveDoiTuongSnapshot(row.doiTuong, md, errors, "doiTuong");
  const doiTuong2 = resolveDoiTuongSnapshot(
    row.doiTuong2,
    md,
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
    taiKhoanNo: tkNo as TaiKhoanLite,
    taiKhoanCo: tkCo as TaiKhoanLite,
    loaiGiaoDich: { ma: lgd!.ma, ten: lgd!.ten },
    nghiepVu: row.nghiepVu as string,
    // QuyChuan không có trường tên → dùng mã làm tên (giống nhập tay)
    nghiepVuTen: row.nghiepVu,
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

  const item: CreateEntryDto = {
    loai: deriveLoai(row.loaiGiaoDich as string),
    ngay: ngay as string,
    soTien: soTien as number,
    noiDung: row.dienGiai || "",
    nguoiGiaoDich: row.nguoiGiaoDich,
    diaChi: row.diaChi,
    ghiChu: row.ghiChu,
    ngayGhiSo: ngayGhiSo ?? undefined,
    nhomGop: row.nhomGop?.trim() || undefined,
    danhMuc: buildDanhMucFromResolved(resolved),
  };

  return { rowNumber: row.rowNumber, errors, warnings, item };
}

/**
 * Resolve đối tượng theo mã: ưu tiên danh mục Đối tượng (KH/NCC/NV/…),
 * nếu không có thì tìm trong danh mục Ngân hàng & Quỹ. Trả về snapshot đã dựng
 * (khác nguồn → khác builder) để danhMuc lưu giống hệt lúc nhập tay.
 */
function resolveDoiTuongSnapshot(
  code: string | undefined,
  md: ImportMasterData,
  errors: RowError[],
  fieldName: string,
): DoiTuongSnapshot | undefined {
  if (!code || code.trim() === "") return undefined;
  const doiTuong = md.doiTuongList.find((x) => x.ma === code);
  if (doiTuong) return buildDoiTuongSnapshot(doiTuong);
  const nganHang = md.nganHangList.find((x) => x.ma === code);
  if (nganHang) return buildNganHangSnapshot(nganHang);
  errors.push({
    field: fieldName,
    message: `${labelOf(fieldName)} '${code}' không tồn tại`,
  });
  return undefined;
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
