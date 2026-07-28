import { nhanTrangThaiQuy, nhanLyDoBienDong, sapHetHan } from './nhanQuy';

describe('nhanQuy', () => {
  it('nhãn trạng thái quỹ', () => {
    expect(nhanTrangThaiQuy('dang_hieu_luc')).toBe('Đang hiệu lực');
    expect(nhanTrangThaiQuy('da_dong')).toBe('Đã đóng');
  });

  it('nhãn lý do biến động phủ đủ 7 lý do backend ghi', () => {
    [
      'cap_dau_nam',
      'cap_len_chinh_thuc',
      'cap_bu_nam_truoc',
      'duyet_don',
      'huy_don',
      'dieu_chinh_tay',
      'het_han',
    ].forEach((lyDo) => {
      expect(nhanLyDoBienDong(lyDo)).not.toBe(lyDo);
    });
  });

  it('lý do lạ thì trả nguyên chuỗi, không vỡ giao diện', () => {
    expect(nhanLyDoBienDong('cai_gi_do')).toBe('cai_gi_do');
  });

  it('sắp hết hạn khi còn ≤ 30 ngày và quỹ còn dư', () => {
    expect(sapHetHan({ hanDung: '2027-03-31', soNgayConLai: 2 }, '2027-03-15')).toBe(true);
    expect(sapHetHan({ hanDung: '2027-03-31', soNgayConLai: 0 }, '2027-03-15')).toBe(false);
    expect(sapHetHan({ hanDung: '2027-03-31', soNgayConLai: 2 }, '2027-01-01')).toBe(false);
  });
});
