import { ThongKeTongQuan, BieuDoThuChi } from '@/types';

export const thongKeTongQuan: ThongKeTongQuan = {
  soDuQuy: 1250000000,
  doanhThuThang: 850000000,
  chiPhiThang: 620000000,
  loiNhuanThang: 230000000,
  congNoPhaiThu: 450000000,
  congNoPhaiTra: 320000000,
  soChungTuChoXuLy: 12,
};

export const bieuDoThuChi: BieuDoThuChi[] = [
  { thang: 'T1', thu: 650000000, chi: 480000000 },
  { thang: 'T2', thu: 720000000, chi: 520000000 },
  { thang: 'T3', thu: 680000000, chi: 490000000 },
  { thang: 'T4', thu: 780000000, chi: 550000000 },
  { thang: 'T5', thu: 820000000, chi: 580000000 },
  { thang: 'T6', thu: 750000000, chi: 530000000 },
  { thang: 'T7', thu: 890000000, chi: 610000000 },
  { thang: 'T8', thu: 920000000, chi: 640000000 },
  { thang: 'T9', thu: 850000000, chi: 600000000 },
  { thang: 'T10', thu: 800000000, chi: 570000000 },
  { thang: 'T11', thu: 870000000, chi: 620000000 },
  { thang: 'T12', thu: 850000000, chi: 620000000 },
];

export const congNoQuaHan = [
  { id: '1', doiTuong: 'Công ty ABC', soTien: 50000000, soNgayQuaHan: 15 },
  { id: '2', doiTuong: 'Công ty XYZ', soTien: 35000000, soNgayQuaHan: 8 },
  { id: '3', doiTuong: 'Công ty DEF', soTien: 28000000, soNgayQuaHan: 22 },
];

export const chungTuGanDay = [
  { id: '1', soPhieu: 'PT-2024-001', loai: 'Thu', soTien: 25000000, ngay: '2024-12-08', doiTuong: 'Công ty ABC' },
  { id: '2', soPhieu: 'PC-2024-045', loai: 'Chi', soTien: 15000000, ngay: '2024-12-08', doiTuong: 'Văn phòng phẩm' },
  { id: '3', soPhieu: 'PT-2024-002', loai: 'Thu', soTien: 42000000, ngay: '2024-12-07', doiTuong: 'Công ty XYZ' },
  { id: '4', soPhieu: 'PC-2024-046', loai: 'Chi', soTien: 8500000, ngay: '2024-12-07', doiTuong: 'Tiền điện' },
  { id: '5', soPhieu: 'PC-2024-047', loai: 'Chi', soTien: 32000000, ngay: '2024-12-06', doiTuong: 'Lương NV' },
];
