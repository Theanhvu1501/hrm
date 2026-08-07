/**
 * Kiểu dữ liệu của màn Báo cáo nhân sự.
 *
 * Điểm quan trọng nhất ở đây là `NguonChiSo`: nó là union, không phải một
 * object có `giaTri?: number`. Nhờ vậy TypeScript không cho phép tồn tại
 * trạng thái "chỉ số chưa có nguồn nhưng vẫn kèm một con số" — đúng yêu cầu
 * nghiệp vụ: chỉ số nào chưa có module nguồn thì BÁO LÀ CHƯA CÓ, không bịa
 * số cho đủ ô.
 */

export type DonVi = 'phan_tram' | 'nguoi' | 'ngay' | 'gio' | 'tien' | 'luot';

/** Chiều nào của chỉ số là tốt — dùng để tô màu biến động so với kỳ trước. */
export type ChieuTot = 'tang' | 'giam';

export interface NguonCoSoLieu {
  co: true;
  giaTri: number;
  /** Trị của kỳ liền trước; vắng thì thẻ không hiện dòng biến động. */
  kyTruoc?: number;
  /** Nguồn dữ liệu thật, hiện ở chân thẻ. Vd "employees + resignations". */
  moTaNguon: string;
}

export interface NguonChuaCo {
  co: false;
  /** Cần gì để có số. Vd "module Tuyển dụng". Bắt buộc, không để trống. */
  canGi: string;
}

export type NguonChiSo = NguonCoSoLieu | NguonChuaCo;

/**
 * Hai type guard dưới đây KHÔNG thừa: `fe/tsconfig.app.json` để `strict: false`
 * (kéo theo `strictNullChecks: false`), mà thu hẹp kiểu theo discriminant chỉ
 * chạy khi `strictNullChecks` bật. Viết thẳng `if (!nguon.co) nguon.canGi` ở
 * chỗ dùng sẽ báo lỗi TS2339. Đi qua guard thì narrowing hoạt động bình thường.
 */
export const coSoLieu = (nguon: NguonChiSo): nguon is NguonCoSoLieu => nguon.co;
export const chuaCoNguon = (nguon: NguonChiSo): nguon is NguonChuaCo => !nguon.co;

export interface ChiSo {
  ma: string;
  ten: string;
  /** Tên tiếng Anh trong ngoặc ở bảng gốc, vd "Time to Fill". */
  tenEn?: string;
  /** Cột "Phân tích & Ý nghĩa Áp dụng" của bảng gốc — chép nguyên văn. */
  yNghia: string;
  donVi: DonVi;
  chieuTot?: ChieuTot;
  nguon: NguonChiSo;
}

export interface ChuoiBieuDo {
  khoa: string;
  ten: string;
  /** Tên biến CSS (xem `mauSac.ts`), KHÔNG phải hex — để đổi theo light/dark. */
  mau: string;
}

export interface DiemBieuDo {
  nhan: string;
  [khoaChuoi: string]: number | string;
}

export interface BieuDo {
  ma: string;
  loai: 'cot' | 'duong';
  tieuDe: string;
  donVi: DonVi;
  chuoi: ChuoiBieuDo[];
  duLieu: DiemBieuDo[];
}

export interface NhomChiSo {
  ma: string;
  soThuTu: number;
  ten: string;
  moTa: string;
  chiSo: ChiSo[];
  bieuDo: BieuDo[];
}
