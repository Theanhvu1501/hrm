/** Loại công thức cho một khoản lương — engine diễn giải, KHÔNG công thức tự do. */
export type LoaiCongThuc =
  | 'LUONG_THEO_CONG' // base/congChuan × (congThuong+congKhac) + base/congChuan × congThuViec × thuViec.tyLe
  | 'DINH_MUC_x_CONG' // thamSo.dinhMuc × congThuong (vd ăn ca 50k×công)
  | 'CO_DINH_THANG' // (thamSo.soTien | phụ cấp từ hồ sơ)/congChuan × (congThuong + congThuViec×thuViec.tyLe)
  | 'PHAN_TRAM_BASE' // thamSo.tyLe × base
  | 'NHAP_THEO_KY' // số nhập/import theo kỳ, khoá theo `ma`
  | 'TIEN_OT'; // lấy thẳng `dv.tienOt` — bảng 03-LĐTL đã tính, engine chỉ tiêu thụ

export interface ThamSoKhoan {
  dinhMuc?: number;
  soTien?: number;
  tyLe?: number;
  /** với CO_DINH_THANG: lấy số tiền từ trường Hồ sơ NV này (vd 'phuCapCoDinh') thay vì soTien. */
  nguonHoSo?: 'phuCapCoDinh';
}

export interface KhoanLuong {
  ma: string;
  ten: string;
  loaiCongThuc: LoaiCongThuc;
  thamSo: ThamSoKhoan;
  /** khoản này có tính vào thu nhập chịu thuế không. */
  chiuThue: boolean;
  /** phần ≤ trần được miễn thuế, phần vượt mới chịu (null = không có trần). */
  tranMienThue: number | null;
  vaoTongThuNhap: boolean;
  vaoBHXH: boolean;
  thuTu: number;
}

export interface BacThue {
  /** cận trên của bậc; null = ∞ (bậc cuối). */
  den: number | null;
  suat: number; // 0..1
}

/** Chế độ bù giờ làm thêm — cấu hình theo TỪNG công ty (nền tảng đa tenant). */
export type CheDoBuLamThem =
  | 'chi_nghi_bu'        // tích quỹ giờ, bảng lương không trả gì
  | 'chi_tien'           // không tích quỹ, bảng lương trả đủ  (P4.2b)
  | 'nhan_vien_chon'     // người nộp chọn từng đơn            (P4.2b)
  | 'nghi_bu_va_chenh';  // tích quỹ ở 1.0 + trả phần chênh    (P4.2b)

export interface CauHinhLamThem {
  cheDoBu: CheDoBuLamThem;
  /**
   * Hệ số TRẢ TIỀN từng loại ngày. Tách khỏi `heSoTichQuy` vì hai con số không
   * nhất thiết bằng nhau: công ty có thể trả tiền theo 1.5 nhưng chỉ cho nghỉ
   * bù ở 1.0.
   */
  heSoTra: Record<string, number>;
  /** Hệ số quy đổi vào quỹ nghỉ bù. */
  heSoTichQuy: Record<string, number>;
  /** Khung giờ tính là ban đêm; `null` = công ty không có ca đêm. */
  khungGioDem: { tu: string; den: string } | null;
  /** Giờ thuộc nhiều loại thì loại đứng TRƯỚC trong mảng này thắng. */
  uuTienLoai: string[];
  /** Loại nào được tách phần chênh miễn thuế TNCN — P4.2c đọc. */
  mienThueChenh: string[];
  /** null = quỹ không bao giờ hết hạn. */
  soThangHanDung: number | null;
  khiHetHan: 'quy_ra_tien' | 'huy_bo';
}

export interface CauHinhLuongData {
  mucKhaiBaoMacDinh: number;
  congChuan: number;
  khoanLuong: KhoanLuong[];
  giamTruBanThan: number;
  giamTruNPT: number;
  bhxh: { tyLe: number; canCu: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN' };
  bacThue: BacThue[];
  thuViec: { tyLe: number };
  quyTacThoiVu: { tyLe: number; nguong: number };
  quyTacCamKet: { mienThue: boolean };
  /**
   * Phần BẢO HIỂM CÔNG TY chịu — không trừ vào lương NLĐ.
   * `tyLeHopDongThu2` dùng khi NV là HĐLĐ thứ 2: công ty chỉ đóng BHTNLĐ-BNN
   * vì BHXH/BHYT/BHTN đã đóng ở nơi thứ nhất.
   */
  bhCongTy: { tyLe: number; tyLeHopDongThu2: number };
  /**
   * Phí công đoàn trừ vào lương NLĐ, tính trên cùng căn cứ với BHXH.
   *
   * Con số 2% chủ sản phẩm chốt LỆCH với khung pháp lý thông thường và được
   * ghi nhận có ý thức (spec P4.2c §4.2): kinh phí công đoàn 2% là DOANH
   * NGHIỆP nộp (NĐ 191/2013 Đ5), còn đoàn phí đoàn viên đóng là 1% và chỉ thu
   * với người LÀ đoàn viên. Đặt trong cấu hình theo tenant để đổi được mà
   * không phải deploy.
   */
  phiCongDoan: { tyLe: number };
  lamTron: number;
  /** Số giờ của MỘT ngày công. Quy đổi ngày↔giờ cho nghỉ bù, và là mẫu số của đơn giá giờ. */
  soGioMoiNgay: number;
  lamThem: CauHinhLamThem;
}

/** Đầu vào engine cho MỘT dòng (một NV, một mức lương). */
export interface DauVaoDongLuong {
  base: number; // luongGoc của mức đang tính
  mucKhaiBao: number; // để BHXH khi canCu = MUC_KHAI_BAO
  congThuong: number;
  congThuViec: number;
  congKhac: number;
  phuCapCoDinh: number; // từ Hồ sơ NV
  soNguoiPhuThuoc: number;
  tamUng: number;
  khauTruKhac: number;
  dongBH: boolean;
  thoiVu: boolean;
  camKet: boolean;
  /** HĐLĐ thứ 2 (NLĐ đã có HĐ chính ở nơi khác). */
  hopDongThu2: boolean;
  /** số nhập theo kỳ, khoá theo `ma` khoản (vd { HIEU_SUAT: 2000000, THUONG: 0 }). */
  nhapTheoKy: Record<string, number>;
  /**
   * Tổng tiền làm thêm của kỳ, lấy từ bảng 03-LĐTL ĐÃ CHỐT.
   *
   * Là con số ĐÃ TÍNH chứ không phải giờ theo loại: để engine tự nhân đơn giá
   * × hệ số là dựng lại y nguyên công thức `tinhDongThemGio()` đã có, tạo HAI
   * nguồn sự thật cho cùng một con số — chúng lệch nhau ngay lần đầu kế toán
   * sửa tay một dòng trên bảng 03-LĐTL.
   */
  tienOt: number;
  /** Phần chênh của `tienOt` được miễn thuế TNCN (TT 111/2013 Đ3.1.i). */
  otMienThue: number;
}

/**
 * Override cấu hình lương cho RIÊNG một NV. Trường `undefined` = kế thừa
 * `CauHinhLuong` của công ty.
 *
 * Chỉ chứa tham số mang tính THỎA THUẬN riêng từng người. Tham số là LUẬT
 * (giảm trừ, bậc thuế, quy tắc thời vụ/cam kết) và quy ước trình bày
 * (`lamTron`) cố ý KHÔNG có ở đây — xem spec P4.1 §4.
 */
export interface CauHinhLuongRieng {
  congChuan?: number;
  thuViecTyLe?: number; // 0..1, cùng đơn vị CauHinhLuong.thuViec.tyLe
  bhxhTyLe?: number; // 0..1
  bhxhCanCu?: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN';
}

/** Giá trị đã resolve (không còn `undefined`) — snapshot vào `DongLuong`. */
export type CauHinhLuongApDung = Required<CauHinhLuongRieng>;

export interface KetQuaLuong {
  giaTriTungKhoan: Record<string, number>;
  tongThuNhap: number;
  /**
   * GỘP để kế toán đọc: `giamTru + mienThueKhoan + otMienThue`.
   *
   * Hai thành phần gốc vẫn lưu riêng bên dưới vì tờ khai 05/KK-TNCN cần "thu
   * nhập miễn thuế" và "các khoản giảm trừ" ở HAI dòng khác nhau — cột gộp
   * mất khả năng điền tờ khai.
   */
  thuNhapMienThue: number;
  /** Phần miễn thuế đến từ KHOẢN LƯƠNG (ăn ca ≤ trần…). */
  mienThueKhoan: number;
  /** Phần chênh tiền làm thêm được miễn. */
  otMienThue: number;
  bhxh: number;
  giamTru: number;
  thuNhapTinhThue: number;
  thue: number;
  /**
   * Trừ khỏi `thucLinh`, KHÔNG trừ khỏi `thuNhapTinhThue` — TT 111/2013 Đ9
   * liệt kê đủ khoản được trừ trước thuế và đoàn phí công đoàn không có ở đó.
   */
  phiCongDoan: number;
  thucLinh: number;
  /** BH phần công ty chịu — KHÔNG trừ vào `thucLinh`. */
  chiPhiBHCongTy: number;
  /** Tổng chi phí công ty bỏ ra cho NV này = `tongThuNhap + chiPhiBHCongTy`. */
  tongChiPhiCongTy: number;
}
