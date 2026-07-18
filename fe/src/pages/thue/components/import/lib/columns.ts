import { ThueSuat } from "@/services/taxService";

export type BangKeVariant = "mua" | "ban";

/** Khóa logic của từng cột. Thứ tự = thứ tự trong file mẫu; parser khớp theo TÊN nên file có
 * thể xếp cột khác thứ tự hoặc thiếu cột không bắt buộc (file mẫu cũ 9 cột). */
export type ImportColumnKey =
  | "ngayHoaDon"
  | "soHoaDon"
  | "kyHieuHoaDon"
  | "ten"
  | "mst"
  | "tenHangHoa"
  | "giaTriChuaThue"
  | "thueSuat"
  | "tienThue"
  | "tongThanhToan"
  | "ghiChu";

export interface ImportColumn {
  key: ImportColumnKey;
  header: string;
  required: boolean;
}

/** Tiêu đề cột 4 & 5 đổi theo biến thể; các cột còn lại giống nhau. */
export function buildColumns(variant: BangKeVariant): ImportColumn[] {
  const doiTac = variant === "mua" ? "người bán" : "người mua";
  return [
    { key: "ngayHoaDon", header: "Ngày hóa đơn", required: true },
    { key: "soHoaDon", header: "Số hóa đơn", required: true },
    { key: "kyHieuHoaDon", header: "Ký hiệu", required: false },
    { key: "ten", header: `Tên ${doiTac}`, required: true },
    { key: "mst", header: `MST ${doiTac}`, required: false },
    { key: "tenHangHoa", header: "Tên hàng hóa / dịch vụ", required: false },
    { key: "giaTriChuaThue", header: "Giá trị chưa thuế", required: true },
    { key: "thueSuat", header: "Thuế suất", required: true },
    // Để trống → BE tính theo công thức. Nhập số → tôn trọng số trên hóa đơn (chênh lệch làm tròn).
    { key: "tienThue", header: "Tiền thuế", required: false },
    { key: "tongThanhToan", header: "Tổng thanh toán", required: false },
    { key: "ghiChu", header: "Ghi chú", required: false },
  ];
}

/** Sheet phụ chứa danh sách thuế suất để gắn dropdown. */
export const THUE_SUAT_SHEET = "DM_ThueSuat";

/** Payload gửi lên BE — chỉ mang cặp trường đối tác của đúng biến thể. */
export interface BangKeImportItem {
  ngayHoaDon: string;
  soHoaDon: string;
  kyHieuHoaDon?: string;
  tenNguoiBan?: string;
  mstNguoiBan?: string;
  tenNguoiMua?: string;
  mstNguoiMua?: string;
  tenHangHoa?: string;
  giaTriChuaThue: number;
  thueSuat: ThueSuat;
  tienThue?: number;
  tongThanhToan?: number;
  ghiChu?: string;
}

/** Một dòng Excel sau khi đọc thô. Ô số giữ kiểu number (ngày = serial, tiền = số). */
export type RawImportRow = {
  rowNumber: number; // số dòng trong Excel (tính cả header)
} & Partial<Record<ImportColumnKey, string | number>>;

export interface RowError {
  field: string;
  message: string;
}

export interface RowValidationResult {
  rowNumber: number;
  errors: RowError[]; // chặn import
  warnings: RowError[]; // vẫn cho import
  item: BangKeImportItem | null; // payload đã dựng nếu không có errors
  key: string; // khóa nhận diện hóa đơn trùng
}

export interface ValidateResult {
  results: RowValidationResult[];
  validItems: BangKeImportItem[];
  hasErrors: boolean;
}
