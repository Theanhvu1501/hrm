import { tinhGioLamTrongNgay } from './gio-lam.util';

const t = (gio: string) => `2026-09-16T${gio}:00.000Z`;

describe('tinhGioLamTrongNgay', () => {
  it('một cặp vào–ra: cộng đúng số giờ', () => {
    const kq = tinhGioLamTrongNgay([
      { loai: 'vao', thoiDiem: t('01:00') },
      { loai: 'ra', thoiDiem: t('10:00') },
    ]);
    expect(kq.tongGio).toBe(9);
    expect(kq.gioVao).toBe(t('01:00'));
    expect(kq.gioRa).toBe(t('10:00'));
    expect(kq.thieuGioRa).toBe(false);
  });

  it('ra ngoài giữa buổi: cộng từng CẶP, không lấy hiệu hai đầu', () => {
    const kq = tinhGioLamTrongNgay([
      { loai: 'vao', thoiDiem: t('01:00') },
      { loai: 'ra', thoiDiem: t('05:00') },
      { loai: 'vao', thoiDiem: t('06:30') },
      { loai: 'ra', thoiDiem: t('10:30') },
    ]);
    // 4h + 4h = 8h, KHÔNG phải 9,5h (hiệu hai đầu).
    expect(kq.tongGio).toBe(8);
  });

  it('quên chấm ra: báo thiếu, không bịa ra giờ kết thúc', () => {
    const kq = tinhGioLamTrongNgay([{ loai: 'vao', thoiDiem: t('01:00') }]);
    expect(kq.tongGio).toBe(0);
    expect(kq.gioRa).toBeNull();
    expect(kq.thieuGioRa).toBe(true);
  });

  it('hai lượt vào liên tiếp: giữ lượt ĐẦU, không xoá mất quãng ở giữa', () => {
    const kq = tinhGioLamTrongNgay([
      { loai: 'vao', thoiDiem: t('01:00') },
      { loai: 'vao', thoiDiem: t('03:00') },
      { loai: 'ra', thoiDiem: t('10:00') },
    ]);
    expect(kq.tongGio).toBe(9);
  });

  it('bấm ra hai lần: lần sau chỉ cập nhật giờ ra, không cộng thêm', () => {
    const kq = tinhGioLamTrongNgay([
      { loai: 'vao', thoiDiem: t('01:00') },
      { loai: 'ra', thoiDiem: t('09:00') },
      { loai: 'ra', thoiDiem: t('10:00') },
    ]);
    expect(kq.tongGio).toBe(8);
    expect(kq.gioRa).toBe(t('10:00'));
  });

  it('lượt ra mồ côi (không có vào) bị bỏ qua', () => {
    const kq = tinhGioLamTrongNgay([{ loai: 'ra', thoiDiem: t('10:00') }]);
    expect(kq.tongGio).toBe(0);
    expect(kq.gioVao).toBeNull();
  });

  it('không phụ thuộc thứ tự truyền vào', () => {
    const kq = tinhGioLamTrongNgay([
      { loai: 'ra', thoiDiem: t('10:00') },
      { loai: 'vao', thoiDiem: t('01:00') },
    ]);
    expect(kq.tongGio).toBe(9);
  });

  it('ca qua đêm: lượt ra sang ngày hôm sau vẫn cộng đúng', () => {
    const kq = tinhGioLamTrongNgay([
      { loai: 'vao', thoiDiem: '2026-09-16T15:00:00.000Z' },
      { loai: 'ra', thoiDiem: '2026-09-16T23:00:00.000Z' },
    ]);
    expect(kq.tongGio).toBe(8);
  });

  it('thời điểm hỏng bị loại, không làm NaN cả bảng', () => {
    const kq = tinhGioLamTrongNgay([
      { loai: 'vao', thoiDiem: 'không-phải-ngày' },
      { loai: 'vao', thoiDiem: t('01:00') },
      { loai: 'ra', thoiDiem: t('09:00') },
    ]);
    expect(kq.tongGio).toBe(8);
  });

  it('danh sách rỗng: 0 giờ, không thiếu gì cả', () => {
    expect(tinhGioLamTrongNgay([])).toStrictEqual({
      gioVao: null,
      gioRa: null,
      tongGio: 0,
      thieuGioRa: false,
    });
  });
});
