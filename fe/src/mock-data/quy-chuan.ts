import { QuyChuan } from '@/types';

export const mockQuyChuan: QuyChuan[] = [
  // Phiếu thu
  { id: '1', loaiGiaoDich: 'PHIEU_THU', nghiepVu: 'Thu tiền bán hàng', taiKhoanNo: '111', taiKhoanCo: '511', moTa: 'Thu tiền mặt bán hàng hóa, dịch vụ' },
  { id: '2', loaiGiaoDich: 'PHIEU_THU', nghiepVu: 'Thu tiền công nợ khách hàng', taiKhoanNo: '111', taiKhoanCo: '131', moTa: 'Thu tiền mặt từ khách hàng thanh toán công nợ' },
  { id: '3', loaiGiaoDich: 'PHIEU_THU', nghiepVu: 'Thu lãi tiền gửi', taiKhoanNo: '111', taiKhoanCo: '515', moTa: 'Thu lãi tiền gửi ngân hàng bằng tiền mặt' },
  { id: '4', loaiGiaoDich: 'PHIEU_THU', nghiepVu: 'Thu hoàn ứng', taiKhoanNo: '111', taiKhoanCo: '141', moTa: 'Thu hoàn ứng từ nhân viên' },
  { id: '5', loaiGiaoDich: 'PHIEU_THU', nghiepVu: 'Thu tiền khác', taiKhoanNo: '111', taiKhoanCo: '711', moTa: 'Thu nhập khác bằng tiền mặt' },
  { id: '6', loaiGiaoDich: 'PHIEU_THU', nghiepVu: 'Rút tiền gửi về quỹ', taiKhoanNo: '111', taiKhoanCo: '112', moTa: 'Rút tiền từ ngân hàng về quỹ tiền mặt' },
  
  // Phiếu chi
  { id: '7', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'Chi mua hàng hóa', taiKhoanNo: '152', taiKhoanCo: '111', moTa: 'Chi tiền mặt mua nguyên vật liệu, hàng hóa' },
  { id: '8', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'Chi trả nhà cung cấp', taiKhoanNo: '331', taiKhoanCo: '111', moTa: 'Chi trả công nợ cho nhà cung cấp' },
  { id: '9', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'Chi lương nhân viên', taiKhoanNo: '334', taiKhoanCo: '111', moTa: 'Chi trả lương cho nhân viên' },
  { id: '10', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'Chi phí bán hàng', taiKhoanNo: '641', taiKhoanCo: '111', moTa: 'Chi phí vận chuyển, quảng cáo, khuyến mãi' },
  { id: '11', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'Chi phí quản lý', taiKhoanNo: '642', taiKhoanCo: '111', moTa: 'Chi phí văn phòng, điện nước, thuê mặt bằng' },
  { id: '12', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'Chi tạm ứng', taiKhoanNo: '141', taiKhoanCo: '111', moTa: 'Tạm ứng tiền cho nhân viên' },
  { id: '13', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'Chi nộp thuế', taiKhoanNo: '333', taiKhoanCo: '111', moTa: 'Chi nộp các khoản thuế cho nhà nước' },
  { id: '14', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'Chi trả lãi vay', taiKhoanNo: '635', taiKhoanCo: '111', moTa: 'Chi trả lãi vay ngân hàng, tổ chức tín dụng' },
  { id: '15', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'Chi khác', taiKhoanNo: '811', taiKhoanCo: '111', moTa: 'Chi phí khác bằng tiền mặt' },
  { id: '16', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'Nộp tiền vào ngân hàng', taiKhoanNo: '112', taiKhoanCo: '111', moTa: 'Nộp tiền mặt vào tài khoản ngân hàng' },
  
  // Báo có ngân hàng
  { id: '17', loaiGiaoDich: 'BAO_CO', nghiepVu: 'Thu tiền bán hàng CK', taiKhoanNo: '112', taiKhoanCo: '511', moTa: 'Khách hàng chuyển khoản thanh toán tiền hàng' },
  { id: '18', loaiGiaoDich: 'BAO_CO', nghiepVu: 'Thu công nợ qua CK', taiKhoanNo: '112', taiKhoanCo: '131', moTa: 'Khách hàng chuyển khoản trả công nợ' },
  { id: '19', loaiGiaoDich: 'BAO_CO', nghiepVu: 'Thu lãi tiền gửi', taiKhoanNo: '112', taiKhoanCo: '515', moTa: 'Ngân hàng ghi có lãi tiền gửi' },
  
  // Báo nợ ngân hàng
  { id: '20', loaiGiaoDich: 'BAO_NO', nghiepVu: 'Chi mua hàng CK', taiKhoanNo: '152', taiKhoanCo: '112', moTa: 'Chuyển khoản mua nguyên vật liệu, hàng hóa' },
  { id: '21', loaiGiaoDich: 'BAO_NO', nghiepVu: 'Chi trả NCC qua CK', taiKhoanNo: '331', taiKhoanCo: '112', moTa: 'Chuyển khoản trả công nợ nhà cung cấp' },
  { id: '22', loaiGiaoDich: 'BAO_NO', nghiepVu: 'Chi lương qua CK', taiKhoanNo: '334', taiKhoanCo: '112', moTa: 'Chuyển khoản trả lương nhân viên' },
  { id: '23', loaiGiaoDich: 'BAO_NO', nghiepVu: 'Chi phí ngân hàng', taiKhoanNo: '642', taiKhoanCo: '112', moTa: 'Phí dịch vụ ngân hàng' },
];
