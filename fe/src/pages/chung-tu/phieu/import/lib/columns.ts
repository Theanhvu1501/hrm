import { CreatePhieuDto } from "@/services/phieuService";

/** Khóa logic của từng cột, theo đúng thứ tự trong file Excel mẫu. */
export type ImportColumnKey =
  | "ngay"
  | "soTien"
  | "noiDung"
  | "nguoiGiaoDich"
  | "diaChi"
  | "ghiChu"
  | "doiTuong"
  | "doiTuong2"
  | "duAn"
  | "boPhan"
  | "doi"
  | "nhanVien"
  | "sanPham"
  | "dongTien"
  | "khoanMuc"
  | "hopDong"
  | "nhomKhuyenMai"
  | "nhomQuanLy";

export interface ImportColumn {
  key: ImportColumnKey;
  header: string;
  required: boolean;
}

/** Thứ tự cột = thứ tự trong mảng này (index 0..17). */
export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "ngay", header: "Ngày chứng từ", required: true },
  { key: "soTien", header: "Số tiền", required: true },
  { key: "noiDung", header: "Nội dung", required: false },
  { key: "nguoiGiaoDich", header: "Người giao dịch", required: false },
  { key: "diaChi", header: "Địa chỉ", required: false },
  { key: "ghiChu", header: "Ghi chú", required: false },
  { key: "doiTuong", header: "Mã đối tượng", required: false },
  { key: "doiTuong2", header: "Mã đối tượng 2", required: false },
  { key: "duAn", header: "Mã dự án", required: false },
  { key: "boPhan", header: "Mã bộ phận", required: false },
  { key: "doi", header: "Mã đội", required: false },
  { key: "nhanVien", header: "Mã nhân viên", required: false },
  { key: "sanPham", header: "Mã sản phẩm", required: false },
  { key: "dongTien", header: "Mã dòng tiền", required: false },
  { key: "khoanMuc", header: "Mã khoản mục", required: false },
  { key: "hopDong", header: "Số hợp đồng", required: false },
  { key: "nhomKhuyenMai", header: "Mã nhóm khuyến mãi", required: false },
  { key: "nhomQuanLy", header: "Mã nhóm quản lý", required: false },
];

/**
 * Các cột gắn danh mục — giá trị có thể ở dạng "Mã - Tên" (chọn từ dropdown).
 * Cần tách mã (extractCode) trước khi khớp với master data.
 */
export const CODE_COLUMN_KEYS: Exclude<ImportColumnKey, DateColumnKey>[] = [
  "doiTuong",
  "doiTuong2",
  "duAn",
  "boPhan",
  "doi",
  "nhanVien",
  "sanPham",
  "dongTien",
  "khoanMuc",
  "hopDong",
  "nhomKhuyenMai",
  "nhomQuanLy",
];

/** Cột ngày: ô định dạng ngày của Excel về đây dạng serial (number). */
export const DATE_COLUMN_KEYS = ["ngay"] as const;
export type DateColumnKey = (typeof DATE_COLUMN_KEYS)[number];

/** Một dòng Excel sau khi parse thô theo key — chỉ cột ngày mới có thể là number. */
export type RawImportRow = {
  rowNumber: number; // số dòng trong Excel (tính cả header)
} & Partial<Record<Exclude<ImportColumnKey, DateColumnKey>, string>> &
  Partial<Record<DateColumnKey, string | number>>;

export interface RowError {
  field: string;
  message: string;
}

export interface RowValidationResult {
  rowNumber: number;
  errors: RowError[]; // chặn import
  warnings: RowError[]; // vẫn cho import
  item: CreatePhieuDto | null; // payload đã dựng nếu không có errors
}

export interface ValidateResult {
  results: RowValidationResult[];
  validItems: CreatePhieuDto[];
  hasErrors: boolean;
}
