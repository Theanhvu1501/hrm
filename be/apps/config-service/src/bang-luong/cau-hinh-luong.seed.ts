import { CauHinhLuongData } from '@app/entities';
import { HE_SO_TICH_MAC_DINH } from '../quy-gio/luat-quy-gio';
import {
  HE_SO_OT_MAC_DINH,
  KHUNG_GIO_DEM_MAC_DINH,
  MIEN_THUE_CHENH_MAC_DINH,
  UU_TIEN_LOAI_MAC_DINH,
} from '../don-cham-cong/luat-don';

export const CAU_HINH_LUONG_MAC_DINH: CauHinhLuongData = {
  mucKhaiBaoMacDinh: 5_500_000,
  congChuan: 24,
  khoanLuong: [
    { ma: 'LUONG_CONG', ten: 'Lương theo công', loaiCongThuc: 'LUONG_THEO_CONG', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: true, thuTu: 1 },
    { ma: 'AN_CA', ten: 'Ăn ca', loaiCongThuc: 'DINH_MUC_x_CONG', thamSo: { dinhMuc: 50_000 }, chiuThue: true, tranMienThue: 1_200_000, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 2 },
    { ma: 'PHU_CAP', ten: 'Phụ cấp cố định', loaiCongThuc: 'CO_DINH_THANG', thamSo: { nguonHoSo: 'phuCapCoDinh' }, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 3 },
    { ma: 'HIEU_SUAT', ten: 'Hiệu suất', loaiCongThuc: 'NHAP_THEO_KY', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 4 },
    { ma: 'THUONG', ten: 'Thưởng', loaiCongThuc: 'NHAP_THEO_KY', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 5 },
    // `chiuThue: true` + `tranMienThue: null` là ĐÚNG: phần miễn thuế của tiền
    // làm thêm KHÔNG suy được từ cờ trên khoản (nó phụ thuộc loại ngày và
    // `mienThueChenh`), nên engine tính riêng qua `dv.otMienThue` rồi cộng
    // thẳng vào rổ miễn thuế. Khai `chiuThue: false` ở đây là miễn thuế TOÀN BỘ
    // tiền làm thêm — sai luật và đếm hai lần.
    // `vaoBHXH: false`: tiền làm thêm không vào nền đóng BHXH.
    { ma: 'TIEN_OT', ten: 'Tiền làm thêm giờ', loaiCongThuc: 'TIEN_OT', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 6 },
  ],
  giamTruBanThan: 15_500_000,
  giamTruNPT: 6_200_000,
  bhxh: { tyLe: 0.105, canCu: 'MUC_KHAI_BAO' },
  // Phần công ty chịu: 21,5% (BHXH 17,5 + BHYT 3 + BHTN 1 + BHTNLĐ-BNN 0,5)
  // với HĐ thường; HĐLĐ thứ 2 chỉ còn BHTNLĐ-BNN 0,5%.
  bhCongTy: { tyLe: 0.215, tyLeHopDongThu2: 0.005 },
  // Trừ vào lương NLĐ, tính trên lương đóng bảo hiểm. Xem ghi chú pháp lý ở
  // `CauHinhLuongData.phiCongDoan` — con số này lệch khung thông thường.
  phiCongDoan: { tyLe: 0.02 },
  // Biểu thuế TNCN lũy tiến 7 bậc theo Luật Thuế TNCN (Điều 22).
  // Sửa lại từ bản cũ chỉ có 5 bậc và sai ngưỡng — Điều chỉnh 20/9 #6.
  bacThue: [
    { den: 5_000_000, suat: 0.05 },    // Bậc 1: đến 5 triệu = 5%
    { den: 10_000_000, suat: 0.1 },    // Bậc 2: 5-10 triệu = 10%
    { den: 18_000_000, suat: 0.15 },   // Bậc 3: 10-18 triệu = 15%
    { den: 32_000_000, suat: 0.2 },    // Bậc 4: 18-32 triệu = 20%
    { den: 52_000_000, suat: 0.25 },   // Bậc 5: 32-52 triệu = 25%
    { den: 80_000_000, suat: 0.3 },    // Bậc 6: 52-80 triệu = 30%
    { den: null, suat: 0.35 },         // Bậc 7: trên 80 triệu = 35%
  ],
  thuViec: { tyLe: 0.85 },
  quyTacThoiVu: { tyLe: 0.1, nguong: 2_000_000 },
  quyTacCamKet: { mienThue: true },
  lamTron: 1000,
  soGioMoiNgay: 8,
  // Chỉ hỗ trợ "chỉ nghỉ bù" ở chặng này — xem CauHinhLamThemHopLe. Bảng hệ
  // số / khung giờ đêm là SEED, công ty sửa được ở màn Cấu hình lương.
  //
  // Sao chép NÔNG chứ không dùng thẳng hằng số: seed đi vào một document rồi
  // được sửa tại chỗ, dùng chung tham chiếu là để một tenant sửa cấu hình làm
  // bẩn hằng số của cả tiến trình.
  lamThem: {
    cheDoBu: 'chi_nghi_bu',
    heSoTra: { ...HE_SO_OT_MAC_DINH },
    heSoTichQuy: { ...HE_SO_TICH_MAC_DINH },
    khungGioDem: { ...KHUNG_GIO_DEM_MAC_DINH },
    uuTienLoai: [...UU_TIEN_LOAI_MAC_DINH],
    mienThueChenh: [...MIEN_THUE_CHENH_MAC_DINH],
    soThangHanDung: null,
    khiHetHan: 'quy_ra_tien',
  },
};
