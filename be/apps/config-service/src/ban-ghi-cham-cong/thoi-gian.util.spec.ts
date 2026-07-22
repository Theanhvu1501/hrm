import {
  ngayVN,
  phutTrongNgayVN,
  thuTrongTuanVN,
  hhmmSangPhut,
} from './thoi-gian.util';

// VN = UTC+7 quanh năm (không có DST), nên dựng Date bằng UTC là cách
// duy nhất viết test không phụ thuộc TZ của máy chạy test.
function utc(y: number, thang: number, ngay: number, h: number, m: number) {
  return new Date(Date.UTC(y, thang - 1, ngay, h, m));
}

describe('thoi-gian.util', () => {
  describe('ngayVN', () => {
    it('trả về ngày theo giờ VN, không theo UTC', () => {
      // 22/07/2026 18:00 UTC = 23/07/2026 01:00 giờ VN
      expect(ngayVN(utc(2026, 7, 22, 18, 0))).toBe('2026-07-23');
    });

    it('không lùi ngày ở đầu ngày VN', () => {
      // 21/07/2026 17:00 UTC = 22/07/2026 00:00 giờ VN
      expect(ngayVN(utc(2026, 7, 21, 17, 0))).toBe('2026-07-22');
    });
  });

  describe('phutTrongNgayVN', () => {
    it('nửa đêm VN trả về 0, không phải 1440', () => {
      expect(phutTrongNgayVN(utc(2026, 7, 21, 17, 0))).toBe(0);
    });

    it('08:05 giờ VN trả về 485', () => {
      expect(phutTrongNgayVN(utc(2026, 7, 22, 1, 5))).toBe(485);
    });

    it('23:59 giờ VN trả về 1439', () => {
      expect(phutTrongNgayVN(utc(2026, 7, 22, 16, 59))).toBe(1439);
    });
  });

  describe('thuTrongTuanVN', () => {
    it('22/07/2026 là thứ Tư → 3', () => {
      expect(thuTrongTuanVN(utc(2026, 7, 22, 3, 0))).toBe(3);
    });

    it('dùng ngày VN chứ không dùng ngày UTC', () => {
      // 25/07/2026 18:00 UTC = 26/07/2026 (Chủ nhật) giờ VN
      expect(thuTrongTuanVN(utc(2026, 7, 25, 18, 0))).toBe(0);
    });
  });

  describe('hhmmSangPhut', () => {
    it('chuyển "08:30" thành 510', () => {
      expect(hhmmSangPhut('08:30')).toBe(510);
    });
  });
});
