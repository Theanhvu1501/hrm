import {
  hanDungCuaKy,
  gioTichTuDonOt,
  phanBoFifo,
  HE_SO_TICH_MAC_DINH,
  QuyKhaDung,
} from './luat-quy-gio';

describe('hanDungCuaKy', () => {
  it('trả ngày cuối của tháng thứ N sau kỳ tích', () => {
    expect(hanDungCuaKy('2026-01', 6)).toBe('2026-07-31');
  });

  it('nhảy đúng sang năm sau', () => {
    expect(hanDungCuaKy('2026-10', 6)).toBe('2027-04-30');
  });

  it('tháng 2 năm nhuận ra 29', () => {
    expect(hanDungCuaKy('2027-08', 6)).toBe('2028-02-29');
  });

  // null = không hết hạn. Trả một ngày THẬT chứ không phải null, để mọi so
  // sánh chuỗi ngày và mọi index vẫn chạy mà không phải rải `if` khắp nơi.
  it('soThangHanDung null cho mốc xa vô hạn', () => {
    expect(hanDungCuaKy('2026-01', null)).toBe('9999-12-31');
  });
});

describe('gioTichTuDonOt', () => {
  it('nhân hệ số theo loại ngày', () => {
    expect(
      gioTichTuDonOt({
        soGioOt: 8,
        loaiNgayOt: 'ngay_le',
        heSoTichQuy: HE_SO_TICH_MAC_DINH,
      }),
    ).toBe(24);
  });

  it('ngày thường dùng hệ số 1.5', () => {
    expect(
      gioTichTuDonOt({
        soGioOt: 4,
        loaiNgayOt: 'ngay_thuong',
        heSoTichQuy: HE_SO_TICH_MAC_DINH,
      }),
    ).toBe(6);
  });

  it('nhận hệ số công ty tự khai, không ép về mặc định', () => {
    expect(
      gioTichTuDonOt({
        soGioOt: 8,
        loaiNgayOt: 'ngay_thuong',
        heSoTichQuy: { ngay_thuong: 1, ngay_nghi: 1, ngay_le: 1 },
      }),
    ).toBe(8);
  });

  // Loại ngày lạ (thêm sau này mà quên cập nhật bảng) rơi về hệ số ngày
  // thường — hệ số THẤP NHẤT. Rơi về hệ số cao là tự tặng giờ cho người nộp.
  it('loại ngày lạ rơi về hệ số ngày thường', () => {
    expect(
      gioTichTuDonOt({
        soGioOt: 2,
        loaiNgayOt: 'ngay_bia_dat',
        heSoTichQuy: HE_SO_TICH_MAC_DINH,
      }),
    ).toBe(3);
  });
});

describe('phanBoFifo', () => {
  const quy = (id: string, hanDung: string, conLai: number): QuyKhaDung => ({
    balanceId: id,
    kyTich: hanDung.slice(0, 7),
    hanDung,
    soGioConLai: conLai,
  });

  it('tiêu quỹ sắp hết hạn trước', () => {
    const kq = phanBoFifo(
      [quy('b2', '2026-12-31', 10), quy('b1', '2026-07-31', 6)],
      8,
    );
    expect(kq).toEqual([
      { balanceId: 'b1', kyTich: '2026-07', soGio: 6 },
      { balanceId: 'b2', kyTich: '2026-12', soGio: 2 },
    ]);
  });

  it('vừa đủ một quỹ thì không đụng quỹ sau', () => {
    const kq = phanBoFifo(
      [quy('b1', '2026-07-31', 8), quy('b2', '2026-12-31', 10)],
      8,
    );
    expect(kq).toEqual([{ balanceId: 'b1', kyTich: '2026-07', soGio: 8 }]);
  });

  // Thiếu số dư PHẢI ném, không được trả phân bổ thiếu: nơi gọi sẽ giữ chỗ
  // theo đúng danh sách này, phân bổ thiếu = cho nghỉ nhiều hơn quỹ có.
  it('không đủ số dư thì ném, không trả phân bổ thiếu', () => {
    expect(() => phanBoFifo([quy('b1', '2026-07-31', 3)], 8)).toThrow(
      /không đủ/i,
    );
  });

  it('bỏ qua quỹ đã cạn', () => {
    const kq = phanBoFifo(
      [quy('b0', '2026-06-30', 0), quy('b1', '2026-07-31', 5)],
      5,
    );
    expect(kq).toEqual([{ balanceId: 'b1', kyTich: '2026-07', soGio: 5 }]);
  });

  it('số giờ cần bằng 0 trả mảng rỗng', () => {
    expect(phanBoFifo([quy('b1', '2026-07-31', 5)], 0)).toEqual([]);
  });
});
