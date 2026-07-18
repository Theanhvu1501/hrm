import {
  buildDoiTuongLoaiIndex,
  makeLoaiMatcher,
  matchLoaiBySnapshot,
} from './doi-tuong-loai.helper';

describe('doi-tuong loai matcher', () => {
  // Ca thật: đối tượng đa loại, snapshot chứng từ chỉ giữ loại chính (loai[0]).
  const danhMuc = [
    { ma: '0110595215', loai: ['KHACH_HANG', 'NHA_CUNG_CAP'] },
    { ma: 'KH01', loai: ['KHACH_HANG'] },
    { ma: 'NCC9', loai: ['NHA_CUNG_CAP'] },
    { ma: 'NV1', loai: 'NHAN_VIEN' }, // dữ liệu cũ chưa migrate sang mảng
  ];
  const match = makeLoaiMatcher(buildDoiTuongLoaiIndex(danhMuc));

  it('đối tượng đa loại KH+NCC khớp CẢ TK 131 (KHACH_HANG) lẫn TK 331 (NHA_CUNG_CAP)', () => {
    expect(match('0110595215', 'KHACH_HANG', 'NHA_CUNG_CAP')).toBe(true);
    expect(match('0110595215', 'KHACH_HANG', 'KHACH_HANG')).toBe(true);
  });

  it('đối tượng đơn loại KHÔNG khớp loại khác', () => {
    expect(match('KH01', 'KHACH_HANG', 'NHA_CUNG_CAP')).toBe(false);
    expect(match('NCC9', 'NHA_CUNG_CAP', 'KHACH_HANG')).toBe(false);
    expect(match('NCC9', 'NHA_CUNG_CAP', 'NHA_CUNG_CAP')).toBe(true);
  });

  it('loai dạng chuỗi (chưa migrate) vẫn khớp', () => {
    expect(match('NV1', 'NHAN_VIEN', 'NHAN_VIEN')).toBe(true);
    expect(match('NV1', 'NHAN_VIEN', 'KHACH_HANG')).toBe(false);
  });

  it('không có mã đối tượng → không khớp', () => {
    expect(match(undefined, 'KHACH_HANG', 'KHACH_HANG')).toBe(false);
    expect(match('', 'KHACH_HANG', 'KHACH_HANG')).toBe(false);
  });

  it('đối tượng đã xoá khỏi danh mục → dự phòng theo snapshot', () => {
    expect(match('DA_XOA', 'NHA_CUNG_CAP', 'NHA_CUNG_CAP')).toBe(true);
    expect(match('DA_XOA', 'KHACH_HANG', 'NHA_CUNG_CAP')).toBe(false);
  });

  it('NGAN_HANG_QUY tra từ danh mục ngân hàng → chỉ tin snapshot', () => {
    expect(match('TK_NH1', 'NGAN_HANG_QUY', 'NGAN_HANG_QUY')).toBe(true);
    expect(match('KH01', 'KHACH_HANG', 'NGAN_HANG_QUY')).toBe(false);
    // mã trùng với 1 đối tượng đa loại nhưng snapshot là ngân hàng → không lẫn
    expect(match('0110595215', 'NGAN_HANG_QUY', 'NHA_CUNG_CAP')).toBe(false);
  });

  it('matcher dự phòng (không có danh mục) giữ hành vi so sánh snapshot', () => {
    expect(matchLoaiBySnapshot('0110595215', 'KHACH_HANG', 'NHA_CUNG_CAP')).toBe(false);
    expect(matchLoaiBySnapshot('NCC9', 'NHA_CUNG_CAP', 'NHA_CUNG_CAP')).toBe(true);
    expect(matchLoaiBySnapshot(undefined, 'NHA_CUNG_CAP', 'NHA_CUNG_CAP')).toBe(false);
  });
});
