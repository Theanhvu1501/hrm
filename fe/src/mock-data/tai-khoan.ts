import { TaiKhoan } from '@/types';

export const mockTaiKhoan: TaiKhoan[] = [
  // Loại 1: Tài sản ngắn hạn
  {
    id: '1',
    ma: '111',
    ten: 'Tiền mặt',
    capDo: 1,
    loai: 'NO',
    nhom: 'Tài sản ngắn hạn',
    moTa: 'Tiền mặt tại quỹ của doanh nghiệp'
  },
  {
    id: '2',
    ma: '1111',
    ten: 'Tiền Việt Nam',
    capDo: 2,
    loai: 'NO',
    nhom: 'Tài sản ngắn hạn',
    parentId: '1',
    moTa: 'Tiền mặt bằng VND'
  },
  {
    id: '3',
    ma: '1112',
    ten: 'Ngoại tệ',
    capDo: 2,
    loai: 'NO',
    nhom: 'Tài sản ngắn hạn',
    parentId: '1',
    moTa: 'Tiền mặt bằng ngoại tệ'
  },
  {
    id: '4',
    ma: '112',
    ten: 'Tiền gửi ngân hàng',
    capDo: 1,
    loai: 'NO',
    nhom: 'Tài sản ngắn hạn',
    moTa: 'Tiền gửi tại các ngân hàng'
  },
  {
    id: '5',
    ma: '1121',
    ten: 'Tiền Việt Nam',
    capDo: 2,
    loai: 'NO',
    nhom: 'Tài sản ngắn hạn',
    parentId: '4',
    moTa: 'Tiền gửi VND tại ngân hàng'
  },
  {
    id: '6',
    ma: '131',
    ten: 'Phải thu của khách hàng',
    capDo: 1,
    loai: 'NO',
    nhom: 'Tài sản ngắn hạn',
    moTa: 'Các khoản phải thu từ khách hàng'
  },
  {
    id: '7',
    ma: '141',
    ten: 'Tạm ứng',
    capDo: 1,
    loai: 'NO',
    nhom: 'Tài sản ngắn hạn',
    moTa: 'Các khoản tạm ứng cho nhân viên'
  },
  {
    id: '8',
    ma: '152',
    ten: 'Nguyên liệu, vật liệu',
    capDo: 1,
    loai: 'NO',
    nhom: 'Tài sản ngắn hạn',
    moTa: 'Nguyên vật liệu tồn kho'
  },

  // Loại 2: Tài sản dài hạn
  {
    id: '9',
    ma: '211',
    ten: 'Tài sản cố định hữu hình',
    capDo: 1,
    loai: 'NO',
    nhom: 'Tài sản dài hạn',
    moTa: 'TSCĐ hữu hình'
  },
  {
    id: '10',
    ma: '2111',
    ten: 'Nhà cửa, vật kiến trúc',
    capDo: 2,
    loai: 'NO',
    nhom: 'Tài sản dài hạn',
    parentId: '9'
  },
  {
    id: '11',
    ma: '2112',
    ten: 'Máy móc, thiết bị',
    capDo: 2,
    loai: 'NO',
    nhom: 'Tài sản dài hạn',
    parentId: '9'
  },
  {
    id: '12',
    ma: '214',
    ten: 'Hao mòn TSCĐ',
    capDo: 1,
    loai: 'CO',
    nhom: 'Tài sản dài hạn',
    moTa: 'Khấu hao tài sản cố định'
  },

  // Loại 3: Nợ phải trả
  {
    id: '13',
    ma: '331',
    ten: 'Phải trả cho người bán',
    capDo: 1,
    loai: 'CO',
    nhom: 'Nợ phải trả',
    moTa: 'Các khoản phải trả nhà cung cấp'
  },
  {
    id: '14',
    ma: '333',
    ten: 'Thuế và các khoản phải nộp NN',
    capDo: 1,
    loai: 'CO',
    nhom: 'Nợ phải trả',
    moTa: 'Thuế và các khoản nộp nhà nước'
  },
  {
    id: '15',
    ma: '3331',
    ten: 'Thuế GTGT phải nộp',
    capDo: 2,
    loai: 'CO',
    nhom: 'Nợ phải trả',
    parentId: '14'
  },
  {
    id: '16',
    ma: '334',
    ten: 'Phải trả người lao động',
    capDo: 1,
    loai: 'CO',
    nhom: 'Nợ phải trả',
    moTa: 'Lương và các khoản phải trả nhân viên'
  },
  {
    id: '17',
    ma: '341',
    ten: 'Vay và nợ thuê tài chính',
    capDo: 1,
    loai: 'CO',
    nhom: 'Nợ phải trả',
    moTa: 'Các khoản vay ngắn và dài hạn'
  },

  // Loại 4: Vốn chủ sở hữu
  {
    id: '18',
    ma: '411',
    ten: 'Vốn đầu tư của chủ sở hữu',
    capDo: 1,
    loai: 'CO',
    nhom: 'Vốn chủ sở hữu',
    moTa: 'Vốn góp của chủ sở hữu'
  },
  {
    id: '19',
    ma: '421',
    ten: 'Lợi nhuận sau thuế chưa phân phối',
    capDo: 1,
    loai: 'CO',
    nhom: 'Vốn chủ sở hữu',
    moTa: 'Lợi nhuận giữ lại'
  },

  // Loại 5: Doanh thu
  {
    id: '20',
    ma: '511',
    ten: 'Doanh thu bán hàng và cung cấp DV',
    capDo: 1,
    loai: 'CO',
    nhom: 'Doanh thu',
    moTa: 'Doanh thu từ hoạt động kinh doanh chính'
  },
  {
    id: '21',
    ma: '515',
    ten: 'Doanh thu hoạt động tài chính',
    capDo: 1,
    loai: 'CO',
    nhom: 'Doanh thu',
    moTa: 'Lãi tiền gửi, lãi đầu tư...'
  },

  // Loại 6: Chi phí
  {
    id: '22',
    ma: '621',
    ten: 'Chi phí nguyên vật liệu trực tiếp',
    capDo: 1,
    loai: 'NO',
    nhom: 'Chi phí',
    moTa: 'NVL sử dụng trực tiếp sản xuất'
  },
  {
    id: '23',
    ma: '622',
    ten: 'Chi phí nhân công trực tiếp',
    capDo: 1,
    loai: 'NO',
    nhom: 'Chi phí',
    moTa: 'Lương nhân công sản xuất trực tiếp'
  },
  {
    id: '24',
    ma: '627',
    ten: 'Chi phí sản xuất chung',
    capDo: 1,
    loai: 'NO',
    nhom: 'Chi phí',
    moTa: 'Chi phí sản xuất chung'
  },
  {
    id: '25',
    ma: '641',
    ten: 'Chi phí bán hàng',
    capDo: 1,
    loai: 'NO',
    nhom: 'Chi phí',
    moTa: 'Chi phí liên quan đến bán hàng'
  },
  {
    id: '26',
    ma: '642',
    ten: 'Chi phí quản lý doanh nghiệp',
    capDo: 1,
    loai: 'NO',
    nhom: 'Chi phí',
    moTa: 'Chi phí quản lý chung'
  },
  {
    id: '27',
    ma: '635',
    ten: 'Chi phí tài chính',
    capDo: 1,
    loai: 'NO',
    nhom: 'Chi phí',
    moTa: 'Lãi vay, chi phí tài chính khác'
  },
];

// Danh sách loại tài khoản
export const loaiTaiKhoan = [
  { value: 'TAI_SAN', label: 'Tài sản' },
  { value: 'NO_PHAI_TRA', label: 'Nợ phải trả' },
  { value: 'VON_CHU_SO_HUU', label: 'Vốn chủ sở hữu' },
  { value: 'DOANH_THU', label: 'Doanh thu' },
  { value: 'CHI_PHI', label: 'Chi phí' },
  { value: 'THU_NHAP_KHAC', label: 'Thu nhập khác' },
  { value: 'CHI_PHI_KHAC', label: 'Chi phí khác' },
  { value: 'XAC_DINH_KQKD', label: 'Xác định kết quả kinh doanh' },
];

// Danh sách nhóm tài khoản
export const nhomTaiKhoan = [
  { value: 'NO', label: 'Nợ' },
  { value: 'CO', label: 'Có' },
  { value: 'LUONG_TINH', label: 'Lưỡng tính (Số dư 2 bên)' },
  { value: 'KHONG_CO_SO_DU', label: 'Không có số dư' },
];
