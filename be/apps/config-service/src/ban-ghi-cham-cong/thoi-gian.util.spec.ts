import { BadRequestException } from '@nestjs/common';
import {
  ngayVN,
  phutTrongNgayVN,
  thuTrongTuanCuaNgay,
  ngayKeTiep,
  kiemTraNgay,
  hhmmSangPhut,
  soNgayGiua,
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

  describe('thuTrongTuanCuaNgay', () => {
    it('22/07/2026 là thứ Tư → 3', () => {
      expect(thuTrongTuanCuaNgay('2026-07-22')).toBe(3);
    });

    it('26/07/2026 là Chủ nhật → 0', () => {
      expect(thuTrongTuanCuaNgay('2026-07-26')).toBe(0);
    });

    it('không phụ thuộc TZ tiến trình — 01/01/2026 luôn là thứ Năm', () => {
      expect(thuTrongTuanCuaNgay('2026-01-01')).toBe(4);
    });

    // Nhánh ném lỗi là lý do duy nhất hàm này được tách riêng — phải có test.
    it.each([
      ['2026-7-22', 'thiếu số 0 ở tháng'],
      ['22-07-2026', 'sai thứ tự'],
      ['2026/07/22', 'sai dấu phân cách'],
      ['', 'chuỗi rỗng'],
      ['hôm nay', 'không phải ngày'],
      ['2026-07-22T00:00:00Z', 'thừa phần giờ'],
    ])('chuỗi dị dạng "%s" (%s) → ném BadRequestException', (xau) => {
      expect(() => thuTrongTuanCuaNgay(xau)).toThrow(BadRequestException);
    });

    it('null/undefined → ném BadRequestException', () => {
      expect(() => thuTrongTuanCuaNgay(undefined as any)).toThrow(
        BadRequestException,
      );
      expect(() => thuTrongTuanCuaNgay(null as any)).toThrow(
        BadRequestException,
      );
    });

    // Đúng định dạng nhưng không tồn tại trên lịch: `Date.UTC` âm thầm cuộn
    // sang tháng sau, ngày công sẽ lệch mà không ai biết.
    it.each([
      ['2026-02-30', '30/02 không tồn tại'],
      ['2026-02-29', '2026 không phải năm nhuận'],
      ['2026-04-31', 'tháng 4 chỉ có 30 ngày'],
      ['2026-13-01', 'tháng 13'],
      ['2026-00-10', 'tháng 0'],
      ['2026-07-00', 'ngày 0'],
      ['2026-07-32', 'ngày 32'],
    ])('ngày không có thật "%s" (%s) → ném BadRequestException', (xau) => {
      expect(() => thuTrongTuanCuaNgay(xau)).toThrow(BadRequestException);
    });

    it('29/02/2024 (năm nhuận thật) vẫn hợp lệ', () => {
      expect(thuTrongTuanCuaNgay('2024-02-29')).toBe(4);
    });

    it('thông báo lỗi nêu rõ giá trị không hợp lệ', () => {
      expect(() => thuTrongTuanCuaNgay('2026-02-30')).toThrow(/2026-02-30/);
    });
  });

  describe('kiemTraNgay', () => {
    it('trả lại chính chuỗi ngày khi hợp lệ', () => {
      expect(kiemTraNgay('2026-07-22')).toBe('2026-07-22');
    });

    it('ném BadRequestException với ngày không có thật', () => {
      expect(() => kiemTraNgay('2026-02-30')).toThrow(BadRequestException);
    });
  });

  describe('ngayKeTiep', () => {
    it('cộng một ngày trong cùng tháng', () => {
      expect(ngayKeTiep('2026-07-20')).toBe('2026-07-21');
    });

    it('vượt ranh giới tháng', () => {
      expect(ngayKeTiep('2026-07-31')).toBe('2026-08-01');
    });

    it('vượt ranh giới năm', () => {
      expect(ngayKeTiep('2026-12-31')).toBe('2027-01-01');
    });

    it('28/02 của năm nhuận ra 29/02', () => {
      expect(ngayKeTiep('2024-02-28')).toBe('2024-02-29');
    });

    it('28/02 của năm KHÔNG nhuận ra 01/03', () => {
      expect(ngayKeTiep('2026-02-28')).toBe('2026-03-01');
    });

    it('ngày không hợp lệ → ném BadRequestException', () => {
      expect(() => ngayKeTiep('2026-02-30')).toThrow(BadRequestException);
    });
  });

  describe('hhmmSangPhut', () => {
    it('chuyển "08:30" thành 510', () => {
      expect(hhmmSangPhut('08:30')).toBe(510);
    });

    it('"00:00" (nửa đêm) trả về 0', () => {
      expect(hhmmSangPhut('00:00')).toBe(0);
    });

    it('"23:59" trả về 1439', () => {
      expect(hhmmSangPhut('23:59')).toBe(1439);
    });

    // Ca hỏng từ dữ liệu cũ / import Excel từng làm soPhutDiMuon thành NaN
    // và Math.max(0, NaN) KHÔNG kẹp về 0 — NaN ghi thẳng xuống MongoDB.
    it.each([
      ['8', 'thiếu phút'],
      ['abc', 'không phải giờ'],
      ['', 'chuỗi rỗng'],
      ['8:30', 'giờ chỉ 1 chữ số'],
      ['25:99', 'giờ và phút vượt ngưỡng'],
      ['24:00', 'giờ 24 không hợp lệ'],
      ['08:60', 'phút 60 không hợp lệ'],
      ['08:30:00', 'thừa phần giây'],
      [' 08:30', 'thừa khoảng trắng'],
    ])('chuỗi dị dạng "%s" (%s) → ném BadRequestException', (xau) => {
      expect(() => hhmmSangPhut(xau)).toThrow(BadRequestException);
    });

    it('null/undefined → ném BadRequestException chứ không trả NaN', () => {
      expect(() => hhmmSangPhut(undefined as any)).toThrow(BadRequestException);
      expect(() => hhmmSangPhut(null as any)).toThrow(BadRequestException);
    });

    it('thông báo lỗi nêu rõ giá trị không hợp lệ', () => {
      expect(() => hhmmSangPhut('25:99')).toThrow(/25:99/);
    });
  });

  describe('soNgayGiua', () => {
    it('tính CẢ hai đầu — một tuần là 7 ngày, không phải 6', () => {
      expect(soNgayGiua('2026-07-21', '2026-07-27')).toBe(7);
    });

    it('cùng một ngày là 1', () => {
      expect(soNgayGiua('2026-07-23', '2026-07-23')).toBe(1);
    });

    // Việt Nam không có DST nên phép trừ 86_400_000 luôn đúng, nhưng mốc phải
    // là UTC 00:00 chứ không phải new Date(chuỗi) đọc theo TZ tiến trình.
    it('bắc qua ranh giới tháng', () => {
      expect(soNgayGiua('2026-07-28', '2026-08-03')).toBe(7);
    });

    it('ném lỗi với ngày không có thật', () => {
      expect(() => soNgayGiua('2026-02-30', '2026-03-01')).toThrow();
    });
  });
});
