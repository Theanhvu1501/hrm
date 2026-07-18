import { BaoCaoPnL } from '@/types';

export const mockPnLData: BaoCaoPnL[] = [
  // Doanh thu
  { khoanMuc: 'Doanh thu bán hàng', thangTruoc: 850000000, thangNay: 920000000, luyKe: 8500000000, keHoach: 900000000, chenhLech: 20000000 },
  { khoanMuc: 'Doanh thu dịch vụ', thangTruoc: 320000000, thangNay: 380000000, luyKe: 3200000000, keHoach: 350000000, chenhLech: 30000000 },
  { khoanMuc: 'Doanh thu khác', thangTruoc: 45000000, thangNay: 52000000, luyKe: 450000000, keHoach: 50000000, chenhLech: 2000000 },
  
  // Giá vốn
  { khoanMuc: 'Giá vốn hàng bán', thangTruoc: -510000000, thangNay: -552000000, luyKe: -5100000000, keHoach: -540000000, chenhLech: -12000000 },
  { khoanMuc: 'Giá vốn dịch vụ', thangTruoc: -160000000, thangNay: -190000000, luyKe: -1600000000, keHoach: -175000000, chenhLech: -15000000 },
  
  // Chi phí bán hàng
  { khoanMuc: 'Chi phí nhân viên bán hàng', thangTruoc: -85000000, thangNay: -88000000, luyKe: -850000000, keHoach: -90000000, chenhLech: 2000000 },
  { khoanMuc: 'Chi phí vận chuyển', thangTruoc: -35000000, thangNay: -42000000, luyKe: -350000000, keHoach: -40000000, chenhLech: -2000000 },
  { khoanMuc: 'Chi phí marketing', thangTruoc: -65000000, thangNay: -75000000, luyKe: -650000000, keHoach: -70000000, chenhLech: -5000000 },
  
  // Chi phí quản lý
  { khoanMuc: 'Chi phí lương quản lý', thangTruoc: -120000000, thangNay: -120000000, luyKe: -1200000000, keHoach: -120000000, chenhLech: 0 },
  { khoanMuc: 'Chi phí văn phòng', thangTruoc: -25000000, thangNay: -28000000, luyKe: -250000000, keHoach: -27000000, chenhLech: -1000000 },
  { khoanMuc: 'Chi phí khấu hao', thangTruoc: -45000000, thangNay: -45000000, luyKe: -450000000, keHoach: -45000000, chenhLech: 0 },
  { khoanMuc: 'Chi phí thuê mặt bằng', thangTruoc: -80000000, thangNay: -80000000, luyKe: -800000000, keHoach: -80000000, chenhLech: 0 },
  
  // Chi phí tài chính
  { khoanMuc: 'Chi phí lãi vay', thangTruoc: -18000000, thangNay: -17000000, luyKe: -180000000, keHoach: -18000000, chenhLech: 1000000 },
  { khoanMuc: 'Chi phí ngân hàng', thangTruoc: -5000000, thangNay: -6000000, luyKe: -50000000, keHoach: -5500000, chenhLech: -500000 },
];

export interface PnLCategory {
  key: string;
  name: string;
  items: string[];
  type: 'revenue' | 'expense';
}

export const pnlCategories: PnLCategory[] = [
  { key: 'doanh_thu', name: 'DOANH THU', items: ['Doanh thu bán hàng', 'Doanh thu dịch vụ', 'Doanh thu khác'], type: 'revenue' },
  { key: 'gia_von', name: 'GIÁ VỐN', items: ['Giá vốn hàng bán', 'Giá vốn dịch vụ'], type: 'expense' },
  { key: 'chi_phi_ban_hang', name: 'CHI PHÍ BÁN HÀNG', items: ['Chi phí nhân viên bán hàng', 'Chi phí vận chuyển', 'Chi phí marketing'], type: 'expense' },
  { key: 'chi_phi_quan_ly', name: 'CHI PHÍ QUẢN LÝ', items: ['Chi phí lương quản lý', 'Chi phí văn phòng', 'Chi phí khấu hao', 'Chi phí thuê mặt bằng'], type: 'expense' },
  { key: 'chi_phi_tai_chinh', name: 'CHI PHÍ TÀI CHÍNH', items: ['Chi phí lãi vay', 'Chi phí ngân hàng'], type: 'expense' },
];

export interface MonthlyPnL {
  thang: string;
  doanhThu: number;
  giaVon: number;
  loiNhuanGop: number;
  chiPhiBanHang: number;
  chiPhiQuanLy: number;
  chiPhiTaiChinh: number;
  loiNhuanTruocThue: number;
  thue: number;
  loiNhuanSauThue: number;
}

export const monthlyPnLData: MonthlyPnL[] = [
  { thang: 'T1/2024', doanhThu: 1100000000, giaVon: 660000000, loiNhuanGop: 440000000, chiPhiBanHang: 170000000, chiPhiQuanLy: 250000000, chiPhiTaiChinh: 20000000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
  { thang: 'T2/2024', doanhThu: 980000000, giaVon: 588000000, loiNhuanGop: 392000000, chiPhiBanHang: 155000000, chiPhiQuanLy: 245000000, chiPhiTaiChinh: 19000000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
  { thang: 'T3/2024', doanhThu: 1250000000, giaVon: 750000000, loiNhuanGop: 500000000, chiPhiBanHang: 185000000, chiPhiQuanLy: 260000000, chiPhiTaiChinh: 21000000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
  { thang: 'T4/2024', doanhThu: 1180000000, giaVon: 708000000, loiNhuanGop: 472000000, chiPhiBanHang: 178000000, chiPhiQuanLy: 255000000, chiPhiTaiChinh: 20000000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
  { thang: 'T5/2024', doanhThu: 1320000000, giaVon: 792000000, loiNhuanGop: 528000000, chiPhiBanHang: 195000000, chiPhiQuanLy: 265000000, chiPhiTaiChinh: 22000000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
  { thang: 'T6/2024', doanhThu: 1150000000, giaVon: 690000000, loiNhuanGop: 460000000, chiPhiBanHang: 175000000, chiPhiQuanLy: 252000000, chiPhiTaiChinh: 19500000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
  { thang: 'T7/2024', doanhThu: 1280000000, giaVon: 768000000, loiNhuanGop: 512000000, chiPhiBanHang: 188000000, chiPhiQuanLy: 258000000, chiPhiTaiChinh: 21500000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
  { thang: 'T8/2024', doanhThu: 1350000000, giaVon: 810000000, loiNhuanGop: 540000000, chiPhiBanHang: 198000000, chiPhiQuanLy: 268000000, chiPhiTaiChinh: 23000000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
  { thang: 'T9/2024', doanhThu: 1200000000, giaVon: 720000000, loiNhuanGop: 480000000, chiPhiBanHang: 180000000, chiPhiQuanLy: 255000000, chiPhiTaiChinh: 20500000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
  { thang: 'T10/2024', doanhThu: 1215000000, giaVon: 670000000, loiNhuanGop: 545000000, chiPhiBanHang: 185000000, chiPhiQuanLy: 270000000, chiPhiTaiChinh: 23000000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
  { thang: 'T11/2024', doanhThu: 1352000000, giaVon: 742000000, loiNhuanGop: 610000000, chiPhiBanHang: 205000000, chiPhiQuanLy: 273000000, chiPhiTaiChinh: 23000000, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 },
].map(item => {
  const loiNhuanTruocThue = item.loiNhuanGop - item.chiPhiBanHang - item.chiPhiQuanLy - item.chiPhiTaiChinh;
  const thue = loiNhuanTruocThue > 0 ? loiNhuanTruocThue * 0.2 : 0;
  return {
    ...item,
    loiNhuanTruocThue,
    thue,
    loiNhuanSauThue: loiNhuanTruocThue - thue
  };
});
