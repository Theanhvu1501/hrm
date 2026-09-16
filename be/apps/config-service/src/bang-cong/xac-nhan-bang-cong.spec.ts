import {
  conNhanPhanHoi,
  daQuaHan,
  nhanTrangThaiXacNhan,
} from './xac-nhan-bang-cong';

describe('daQuaHan', () => {
  it('đúng NGÀY hạn thì CHƯA quá hạn — hết ngày đó vẫn phản hồi được', () => {
    expect(daQuaHan({ hanXacNhan: '2026-09-20' }, '2026-09-20')).toBe(false);
  });

  it('hôm sau ngày hạn là quá hạn', () => {
    expect(daQuaHan({ hanXacNhan: '2026-09-20' }, '2026-09-21')).toBe(true);
  });

  it('chưa đặt hạn thì không bao giờ quá hạn', () => {
    expect(daQuaHan({}, '2099-12-31')).toBe(false);
  });

  it('so sánh đúng khi sang tháng/năm mới', () => {
    expect(daQuaHan({ hanXacNhan: '2026-12-31' }, '2027-01-01')).toBe(true);
    expect(daQuaHan({ hanXacNhan: '2026-09-30' }, '2026-10-01')).toBe(true);
  });
});

describe('conNhanPhanHoi', () => {
  it('đang chờ và còn hạn: nhận', () => {
    expect(
      conNhanPhanHoi(
        { trangThaiXacNhan: 'cho_xac_nhan', hanXacNhan: '2026-09-20' },
        '2026-09-19',
      ),
    ).toBe(true);
  });

  it('quá hạn: không nhận nữa — hạn phải có tác dụng thật', () => {
    expect(
      conNhanPhanHoi(
        { trangThaiXacNhan: 'cho_xac_nhan', hanXacNhan: '2026-09-20' },
        '2026-09-21',
      ),
    ).toBe(false);
  });

  it('đã xác nhận rồi thì thôi, không ghi đè ý kiến vừa gửi', () => {
    expect(
      conNhanPhanHoi(
        { trangThaiXacNhan: 'da_xac_nhan', hanXacNhan: '2026-09-30' },
        '2026-09-20',
      ),
    ).toBe(false);
  });

  it('đã đề nghị điều chỉnh: bóng ở sân C&B, không chồng đề nghị', () => {
    expect(
      conNhanPhanHoi(
        { trangThaiXacNhan: 'de_nghi_dieu_chinh', hanXacNhan: '2026-09-30' },
        '2026-09-20',
      ),
    ).toBe(false);
  });

  it('chưa gửi thì chưa có gì để phản hồi', () => {
    expect(conNhanPhanHoi({ trangThaiXacNhan: 'chua_gui' }, '2026-09-20')).toBe(
      false,
    );
  });
});

describe('nhanTrangThaiXacNhan', () => {
  it('quá hạn mà chưa ai phản hồi: nói rõ là tự động khoá', () => {
    expect(
      nhanTrangThaiXacNhan(
        { trangThaiXacNhan: 'cho_xac_nhan', hanXacNhan: '2026-09-20' },
        '2026-09-25',
      ),
    ).toBe('Quá hạn — tự động khoá');
  });

  it('các trạng thái còn lại đọc đúng chữ', () => {
    const h = { hanXacNhan: '2026-09-30' };
    expect(
      nhanTrangThaiXacNhan({ ...h, trangThaiXacNhan: 'cho_xac_nhan' }, '2026-09-20'),
    ).toBe('Chờ nhân viên xác nhận');
    expect(
      nhanTrangThaiXacNhan({ ...h, trangThaiXacNhan: 'da_xac_nhan' }, '2026-09-20'),
    ).toBe('Nhân viên đã xác nhận');
    expect(
      nhanTrangThaiXacNhan(
        { ...h, trangThaiXacNhan: 'de_nghi_dieu_chinh' },
        '2026-09-20',
      ),
    ).toBe('Nhân viên đề nghị điều chỉnh');
    expect(nhanTrangThaiXacNhan({}, '2026-09-20')).toBe('Chưa gửi');
  });
});
