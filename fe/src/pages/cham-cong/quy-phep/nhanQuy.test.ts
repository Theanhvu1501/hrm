import { nhanTrangThaiQuy, nhanLyDoBienDong, oDuKien, sapHetHan } from './nhanQuy';

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

describe('oDuKien (P3.10)', () => {
  const dat = {
    congHopLe: 13,
    soNgayLamViecChuan: 26,
    datNguong: true,
    soNgayDuKien: 1,
    daTich: false,
  };

  it('không có dữ liệu tháng này → không áp dụng', () => {
    expect(oDuKien(undefined)).toEqual({ kieu: 'khong_ap_dung' });
  });

  it('đã tích rồi thì báo đã vào số dư, KHÔNG hiện lại như dự kiến', () => {
    // Hiện lại "+1 ngày" cho tháng đã cộng vào số dư là mời người đọc cộng
    // hai lần.
    expect(oDuKien({ ...dat, daTich: true })).toEqual({ kieu: 'da_tich' });
  });

  it('đạt ngưỡng → nêu số ngày và tỉ lệ công', () => {
    expect(oDuKien(dat)).toEqual({
      kieu: 'dat',
      soNgay: 1,
      congHopLe: 13,
      chuan: 26,
    });
  });

  it('chưa đạt → nêu còn cần bao nhiêu', () => {
    expect(oDuKien({ ...dat, congHopLe: 8, datNguong: false, soNgayDuKien: 0 })).toEqual({
      kieu: 'chua_dat',
      congHopLe: 8,
      chuan: 26,
      can: 13,
    });
  });

  it('tháng có số ngày làm việc LẺ → ngưỡng làm tròn LÊN, không hứa thiếu', () => {
    // 21 ngày làm việc ⇒ ngưỡng thật 10,5. Hiện "cần ≥10" là sai: làm 10 công
    // KHÔNG đạt. Phải là 11.
    const o = oDuKien({
      congHopLe: 4,
      soNgayLamViecChuan: 21,
      datNguong: false,
      soNgayDuKien: 0,
      daTich: false,
    });
    expect(o).toMatchObject({ can: 11 });
  });
});
