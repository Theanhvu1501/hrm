import { chuanHoaIp } from './ip.util';

describe('chuanHoaIp', () => {
  it('giữ nguyên IPv4 thuần', () => {
    expect(chuanHoaIp('113.161.20.5')).toBe('113.161.20.5');
  });

  it('bỏ tiền tố ::ffff: của IPv4-mapped IPv6 (dạng Express hay trả)', () => {
    expect(chuanHoaIp('::ffff:113.161.20.5')).toBe('113.161.20.5');
  });

  it('bỏ tiền tố ::ffff: viết hoa', () => {
    expect(chuanHoaIp('::FFFF:10.0.0.1')).toBe('10.0.0.1');
  });

  it('lấy chặng ĐẦU TIÊN của X-Forwarded-For (gần client nhất)', () => {
    expect(chuanHoaIp('113.161.20.5, 10.0.0.1')).toBe('113.161.20.5');
  });

  it('chịu được khoảng trắng thừa quanh các chặng', () => {
    expect(chuanHoaIp('  113.161.20.5 ,10.0.0.1 , 172.16.0.9 ')).toBe(
      '113.161.20.5',
    );
  });

  it('gộp cả hai việc: chặng đầu tiên dạng ::ffff:', () => {
    expect(chuanHoaIp('::ffff:113.161.20.5, 10.0.0.1')).toBe('113.161.20.5');
  });

  it('chuỗi rỗng → undefined', () => {
    expect(chuanHoaIp('')).toBeUndefined();
  });

  it('chuỗi chỉ có khoảng trắng/dấu phẩy → undefined', () => {
    expect(chuanHoaIp('   ')).toBeUndefined();
    expect(chuanHoaIp(' , 10.0.0.1')).toBeUndefined();
  });

  it('undefined/null → undefined', () => {
    expect(chuanHoaIp(undefined)).toBeUndefined();
    expect(chuanHoaIp(null)).toBeUndefined();
  });

  it('IPv6 thật KHÔNG bị cắt bậy', () => {
    expect(chuanHoaIp('2001:db8::1')).toBe('2001:db8::1');
    expect(chuanHoaIp('::1')).toBe('::1');
    // Dạng hex sau ::ffff: không phải IPv4 dotted-quad → giữ nguyên,
    // cắt đi sẽ ra chuỗi vô nghĩa "7161:1405".
    expect(chuanHoaIp('::ffff:7161:1405')).toBe('::ffff:7161:1405');
  });

  it('không cắt khi phần sau ::ffff: không phải IPv4 hợp lệ', () => {
    expect(chuanHoaIp('::ffff:999.1.1.1')).toBe('::ffff:999.1.1.1');
    expect(chuanHoaIp('::ffff:1.2.3')).toBe('::ffff:1.2.3');
  });
});
