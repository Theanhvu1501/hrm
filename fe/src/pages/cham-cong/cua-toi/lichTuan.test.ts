import { describe, it, expect } from 'vitest';
import {
  dauTuanCua,
  dichTuan,
  bayNgayTu,
  gomTheoNgay,
  mauChamNgay,
  nhanTuan,
} from './lichTuan';
import { AttendanceRecord } from '@/services/attendanceRecordService';

function banGhi(ngay: string, loai: 'vao' | 'ra'): AttendanceRecord {
  return {
    id: `${ngay}-${loai}`,
    employeeId: 'emp-1',
    ngay,
    loai,
    thoiDiem: `${ngay}T01:00:00.000Z`,
    ngoaiVung: false,
    soPhutDiMuon: 0,
    soPhutVeSom: 0,
    laNgayNghi: false,
    nguonTao: 'tu_cham',
  };
}

describe('dauTuanCua', () => {
  // Tuần bắt đầu từ THỨ HAI theo thói quen Việt Nam, không phải Chủ Nhật
  // như mặc định của JS getDay().
  it('thứ Tư 23/07/2026 thuộc tuần bắt đầu thứ Hai 20/07', () => {
    expect(dauTuanCua('2026-07-23')).toBe('2026-07-20');
  });

  it('chính thứ Hai thì trả về chính nó', () => {
    expect(dauTuanCua('2026-07-20')).toBe('2026-07-20');
  });

  it('Chủ Nhật thuộc tuần TRƯỚC, không mở tuần mới', () => {
    expect(dauTuanCua('2026-07-26')).toBe('2026-07-20');
  });
});

describe('dichTuan', () => {
  it('lùi một tuần', () => {
    expect(dichTuan('2026-07-20', -1)).toBe('2026-07-13');
  });

  it('tiến một tuần, bắc qua ranh giới tháng', () => {
    expect(dichTuan('2026-07-27', 1)).toBe('2026-08-03');
  });
});

describe('bayNgayTu', () => {
  it('trả đúng 7 ngày liên tiếp từ thứ Hai', () => {
    expect(bayNgayTu('2026-07-20')).toEqual([
      '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23',
      '2026-07-24', '2026-07-25', '2026-07-26',
    ]);
  });
});

describe('gomTheoNgay', () => {
  it('gom bản ghi theo trường ngay', () => {
    const kq = gomTheoNgay([
      banGhi('2026-07-20', 'vao'),
      banGhi('2026-07-20', 'ra'),
      banGhi('2026-07-21', 'vao'),
    ]);

    expect(Object.keys(kq).sort()).toEqual(['2026-07-20', '2026-07-21']);
    expect(kq['2026-07-20']).toHaveLength(2);
  });
});

describe('mauChamNgay', () => {
  it('đủ vào và ra → xanh', () => {
    expect(mauChamNgay([banGhi('2026-07-20', 'vao'), banGhi('2026-07-20', 'ra')])).toBe('xanh');
  });

  it('có vào nhưng chưa ra → đỏ', () => {
    expect(mauChamNgay([banGhi('2026-07-20', 'vao')])).toBe('do');
  });

  it('có ra nhưng thiếu vào → đỏ', () => {
    expect(mauChamNgay([banGhi('2026-07-20', 'ra')])).toBe('do');
  });

  /**
   * Không có bản ghi = XÁM, không phải đỏ. Màn hình không biết ngày đó có
   * phải ngày làm việc không: /hom-nay chỉ trả ca của HÔM NAY, còn lịch
   * nghỉ tuần, ngày lễ và đơn nghỉ phép nằm ở ba nguồn khác. Bôi đỏ theo
   * ca hiện tại sẽ bôi đỏ Chủ Nhật và ngày lễ của cả công ty.
   */
  it('không có bản ghi → xám, kể cả ngày quá khứ', () => {
    expect(mauChamNgay([])).toBe('xam');
    expect(mauChamNgay(undefined)).toBe('xam');
  });
});

describe('nhanTuan', () => {
  it('gọn trong một dòng, cùng tháng', () => {
    expect(nhanTuan('2026-07-20')).toBe('Tuần 20–26/07');
  });

  it('bắc qua tháng thì hiện cả hai tháng', () => {
    expect(nhanTuan('2026-07-27')).toBe('Tuần 27/07–02/08');
  });
});
