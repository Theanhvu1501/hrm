import { DongTien } from '@/types';

export const loaiDongTienOptions = [
  { value: 'KINH_DOANH', label: 'Hoạt động kinh doanh', color: 'blue' },
  { value: 'DAU_TU', label: 'Hoạt động đầu tư', color: 'green' },
  { value: 'TAI_CHINH', label: 'Hoạt động tài chính', color: 'purple' },
];

export const mockDongTien: DongTien[] = [
  {
    id: '1',
    ma: 'DT001',
    ten: 'Thu từ bán hàng',
    loai: 'KINH_DOANH',
    moTa: 'Doanh thu từ hoạt động bán hàng, cung cấp dịch vụ',
  },
  {
    id: '2',
    ma: 'DT002',
    ten: 'Thu từ công nợ phải thu',
    loai: 'KINH_DOANH',
    moTa: 'Thu hồi các khoản phải thu từ khách hàng',
  },
  {
    id: '3',
    ma: 'DT003',
    ten: 'Chi trả nhà cung cấp',
    loai: 'KINH_DOANH',
    moTa: 'Thanh toán tiền hàng cho nhà cung cấp',
  },
  {
    id: '4',
    ma: 'DT004',
    ten: 'Chi lương nhân viên',
    loai: 'KINH_DOANH',
    moTa: 'Chi trả lương và các khoản phụ cấp cho nhân viên',
  },
  {
    id: '5',
    ma: 'DT005',
    ten: 'Chi phí hoạt động',
    loai: 'KINH_DOANH',
    moTa: 'Chi phí vận hành, điện nước, văn phòng phẩm',
  },
  {
    id: '6',
    ma: 'DT006',
    ten: 'Thu từ thanh lý TSCĐ',
    loai: 'DAU_TU',
    moTa: 'Tiền thu từ thanh lý, nhượng bán tài sản cố định',
  },
  {
    id: '7',
    ma: 'DT007',
    ten: 'Chi mua TSCĐ',
    loai: 'DAU_TU',
    moTa: 'Chi tiền mua sắm tài sản cố định',
  },
  {
    id: '8',
    ma: 'DT008',
    ten: 'Chi đầu tư dự án',
    loai: 'DAU_TU',
    moTa: 'Chi phí đầu tư vào các dự án mới',
  },
  {
    id: '9',
    ma: 'DT009',
    ten: 'Thu từ vay ngân hàng',
    loai: 'TAI_CHINH',
    moTa: 'Tiền nhận được từ các khoản vay',
  },
  {
    id: '10',
    ma: 'DT010',
    ten: 'Chi trả nợ vay',
    loai: 'TAI_CHINH',
    moTa: 'Chi tiền trả nợ gốc và lãi vay',
  },
  {
    id: '11',
    ma: 'DT011',
    ten: 'Thu góp vốn',
    loai: 'TAI_CHINH',
    moTa: 'Tiền nhận được từ góp vốn cổ đông',
  },
  {
    id: '12',
    ma: 'DT012',
    ten: 'Chi trả cổ tức',
    loai: 'TAI_CHINH',
    moTa: 'Chi trả cổ tức cho cổ đông',
  },
];
