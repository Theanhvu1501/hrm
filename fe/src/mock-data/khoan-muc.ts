import { KhoanMuc } from '@/types';

export const loaiKhoanMucOptions = [
  { value: 'CHI_PHI', label: 'Chi phí', color: 'red' },
  { value: 'DOANH_THU', label: 'Doanh thu', color: 'green' },
];

export const nhomKhoanMucOptions = [
  // Chi phí
  { value: 'CHI_PHI_NGUYEN_VAT_LIEU', label: 'Chi phí nguyên vật liệu', loai: 'CHI_PHI' },
  { value: 'CHI_PHI_NHAN_CONG', label: 'Chi phí nhân công', loai: 'CHI_PHI' },
  { value: 'CHI_PHI_MAY_MOC', label: 'Chi phí máy móc thiết bị', loai: 'CHI_PHI' },
  { value: 'CHI_PHI_QUAN_LY', label: 'Chi phí quản lý', loai: 'CHI_PHI' },
  { value: 'CHI_PHI_BAN_HANG', label: 'Chi phí bán hàng', loai: 'CHI_PHI' },
  { value: 'CHI_PHI_TAI_CHINH', label: 'Chi phí tài chính', loai: 'CHI_PHI' },
  { value: 'CHI_PHI_KHAC', label: 'Chi phí khác', loai: 'CHI_PHI' },
  // Doanh thu
  { value: 'DOANH_THU_BAN_HANG', label: 'Doanh thu bán hàng', loai: 'DOANH_THU' },
  { value: 'DOANH_THU_DICH_VU', label: 'Doanh thu dịch vụ', loai: 'DOANH_THU' },
  { value: 'DOANH_THU_TAI_CHINH', label: 'Doanh thu tài chính', loai: 'DOANH_THU' },
  { value: 'DOANH_THU_KHAC', label: 'Doanh thu khác', loai: 'DOANH_THU' },
];

export const mockKhoanMuc: KhoanMuc[] = [
  // Chi phí
  {
    id: '1',
    ma: 'CP001',
    ten: 'Chi phí xi măng',
    loai: 'CHI_PHI',
    nhom: 'CHI_PHI_NGUYEN_VAT_LIEU',
  },
  {
    id: '2',
    ma: 'CP002',
    ten: 'Chi phí thép xây dựng',
    loai: 'CHI_PHI',
    nhom: 'CHI_PHI_NGUYEN_VAT_LIEU',
  },
  {
    id: '3',
    ma: 'CP003',
    ten: 'Chi phí cát, đá',
    loai: 'CHI_PHI',
    nhom: 'CHI_PHI_NGUYEN_VAT_LIEU',
  },
  {
    id: '4',
    ma: 'CP004',
    ten: 'Lương công nhân',
    loai: 'CHI_PHI',
    nhom: 'CHI_PHI_NHAN_CONG',
  },
  {
    id: '5',
    ma: 'CP005',
    ten: 'Bảo hiểm xã hội',
    loai: 'CHI_PHI',
    nhom: 'CHI_PHI_NHAN_CONG',
  },
  {
    id: '6',
    ma: 'CP006',
    ten: 'Thuê máy xúc',
    loai: 'CHI_PHI',
    nhom: 'CHI_PHI_MAY_MOC',
  },
  {
    id: '7',
    ma: 'CP007',
    ten: 'Thuê cẩu',
    loai: 'CHI_PHI',
    nhom: 'CHI_PHI_MAY_MOC',
  },
  {
    id: '8',
    ma: 'CP008',
    ten: 'Chi phí văn phòng phẩm',
    loai: 'CHI_PHI',
    nhom: 'CHI_PHI_QUAN_LY',
  },
  {
    id: '9',
    ma: 'CP009',
    ten: 'Chi phí điện nước',
    loai: 'CHI_PHI',
    nhom: 'CHI_PHI_QUAN_LY',
  },
  {
    id: '10',
    ma: 'CP010',
    ten: 'Lãi vay ngân hàng',
    loai: 'CHI_PHI',
    nhom: 'CHI_PHI_TAI_CHINH',
  },
  // Doanh thu
  {
    id: '11',
    ma: 'DT001',
    ten: 'Doanh thu xây dựng công trình',
    loai: 'DOANH_THU',
    nhom: 'DOANH_THU_DICH_VU',
  },
  {
    id: '12',
    ma: 'DT002',
    ten: 'Doanh thu tư vấn thiết kế',
    loai: 'DOANH_THU',
    nhom: 'DOANH_THU_DICH_VU',
  },
  {
    id: '13',
    ma: 'DT003',
    ten: 'Doanh thu bán vật liệu',
    loai: 'DOANH_THU',
    nhom: 'DOANH_THU_BAN_HANG',
  },
  {
    id: '14',
    ma: 'DT004',
    ten: 'Lãi tiền gửi ngân hàng',
    loai: 'DOANH_THU',
    nhom: 'DOANH_THU_TAI_CHINH',
  },
  {
    id: '15',
    ma: 'DT005',
    ten: 'Thu nhập từ thanh lý tài sản',
    loai: 'DOANH_THU',
    nhom: 'DOANH_THU_KHAC',
  },
];
