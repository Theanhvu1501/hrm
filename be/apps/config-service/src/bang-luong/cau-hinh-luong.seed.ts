import { CauHinhLuongData } from '@app/entities';
import { HE_SO_TICH_MAC_DINH } from '../quy-gio/luat-quy-gio';

export const CAU_HINH_LUONG_MAC_DINH: CauHinhLuongData = {
  mucKhaiBaoMacDinh: 5_500_000,
  congChuan: 24,
  khoanLuong: [
    { ma: 'LUONG_CONG', ten: 'Lương theo công', loaiCongThuc: 'LUONG_THEO_CONG', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: true, thuTu: 1 },
    { ma: 'AN_CA', ten: 'Ăn ca', loaiCongThuc: 'DINH_MUC_x_CONG', thamSo: { dinhMuc: 50_000 }, chiuThue: true, tranMienThue: 1_200_000, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 2 },
    { ma: 'PHU_CAP', ten: 'Phụ cấp cố định', loaiCongThuc: 'CO_DINH_THANG', thamSo: { nguonHoSo: 'phuCapCoDinh' }, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 3 },
    { ma: 'HIEU_SUAT', ten: 'Hiệu suất', loaiCongThuc: 'NHAP_THEO_KY', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 4 },
    { ma: 'THUONG', ten: 'Thưởng', loaiCongThuc: 'NHAP_THEO_KY', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 5 },
  ],
  giamTruBanThan: 15_500_000,
  giamTruNPT: 6_200_000,
  bhxh: { tyLe: 0.105, canCu: 'MUC_KHAI_BAO' },
  // Phần công ty chịu: 21,5% (BHXH 17,5 + BHYT 3 + BHTN 1 + BHTNLĐ-BNN 0,5)
  // với HĐ thường; HĐLĐ thứ 2 chỉ còn BHTNLĐ-BNN 0,5%.
  bhCongTy: { tyLe: 0.215, tyLeHopDongThu2: 0.005 },
  bacThue: [
    { den: 10_000_000, suat: 0.05 },
    { den: 30_000_000, suat: 0.1 },
    { den: 60_000_000, suat: 0.2 },
    { den: 100_000_000, suat: 0.3 },
    { den: null, suat: 0.35 },
  ],
  thuViec: { tyLe: 0.85 },
  quyTacThoiVu: { tyLe: 0.1, nguong: 2_000_000 },
  quyTacCamKet: { mienThue: true },
  lamTron: 1000,
  soGioMoiNgay: 8,
  // Chỉ hỗ trợ "chỉ nghỉ bù" ở chặng P4.2a — xem CauHinhLamThemHopLe.
  lamThem: {
    cheDoBu: 'chi_nghi_bu',
    heSoTichQuy: HE_SO_TICH_MAC_DINH,
    soThangHanDung: null,
    khiHetHan: 'quy_ra_tien',
  },
};
