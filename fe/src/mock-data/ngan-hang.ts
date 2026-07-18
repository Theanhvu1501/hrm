import { TaiKhoanNganHang } from '@/types';

export const loaiTaiKhoanOptions = [
  { value: 'TIEN_MAT', label: 'Tiền mặt', color: 'orange', icon: 'wallet' },
  { value: 'NGAN_HANG', label: 'Ngân hàng', color: 'blue', icon: 'bank' },
];

export const danhSachNganHang = [
  { value: 'VCB', label: 'Vietcombank' },
  { value: 'TCB', label: 'Techcombank' },
  { value: 'BIDV', label: 'BIDV' },
  { value: 'VTB', label: 'Vietinbank' },
  { value: 'MB', label: 'MB Bank' },
  { value: 'ACB', label: 'ACB' },
  { value: 'VPB', label: 'VPBank' },
  { value: 'SHB', label: 'SHB' },
  { value: 'TPB', label: 'TPBank' },
  { value: 'MSB', label: 'MSB' },
  { value: 'SCB', label: 'Sacombank' },
  { value: 'HDB', label: 'HDBank' },
  { value: 'OCB', label: 'OCB' },
  { value: 'AGRI', label: 'Agribank' },
  { value: 'KHAC', label: 'Ngân hàng khác' },
];

export const mockTaiKhoanNganHang: TaiKhoanNganHang[] = [
  {
    id: '1',
    ma: 'QTM01',
    ten: 'Quỹ tiền mặt VNĐ',
    loai: 'TIEN_MAT',
    soDu: 250000000,
  },
  {
    id: '2',
    ma: 'QTM02',
    ten: 'Quỹ tiền mặt tạm ứng',
    loai: 'TIEN_MAT',
    soDu: 50000000,
  },
  {
    id: '3',
    ma: 'NH001',
    ten: 'Tài khoản thanh toán VCB',
    loai: 'NGAN_HANG',
    soDu: 1500000000,
    nganHang: 'Vietcombank',
    soTaiKhoan: '0071001234567',
  },
  {
    id: '4',
    ma: 'NH002',
    ten: 'Tài khoản thanh toán TCB',
    loai: 'NGAN_HANG',
    soDu: 800000000,
    nganHang: 'Techcombank',
    soTaiKhoan: '19035678901234',
  },
  {
    id: '5',
    ma: 'NH003',
    ten: 'Tài khoản thanh toán BIDV',
    loai: 'NGAN_HANG',
    soDu: 650000000,
    nganHang: 'BIDV',
    soTaiKhoan: '31410001234567',
  },
  {
    id: '6',
    ma: 'NH004',
    ten: 'Tài khoản tiền gửi VCB',
    loai: 'NGAN_HANG',
    soDu: 2000000000,
    nganHang: 'Vietcombank',
    soTaiKhoan: '0071009876543',
  },
  {
    id: '7',
    ma: 'NH005',
    ten: 'Tài khoản MB Bank',
    loai: 'NGAN_HANG',
    soDu: 320000000,
    nganHang: 'MB Bank',
    soTaiKhoan: '0801234567890',
  },
];
