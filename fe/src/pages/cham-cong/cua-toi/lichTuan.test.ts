import { describe, it, expect } from 'vitest';
import {
  dauTuanCua,
  dichTuan,
  bayNgayTu,
  gomTheoNgay,
  mauChamNgay,
  nhanTuan,
  oLichNgay,
  trangThaiTheoNgay,
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

/**
 * Ô một ngày trên lịch tuần, sau khi backend cấp được danh sách ngày nghỉ.
 * Xám giờ thu hẹp đúng về nghĩa "ngày làm việc mà không có bản ghi nào" —
 * tức là QUÊN CHẤM — thay vì gộp chung cả ngày nghỉ và ngày lễ như trước.
 */
describe('oLichNgay', () => {
  it('ngày nghỉ theo lịch → xanh kèm chữ N', () => {
    // Xanh chứ không phải màu thứ tư: màu xanh trả lời câu "ngày này còn
    // việc gì phải làm không?", mà ngày nghỉ câu trả lời là không — y hệt
    // ngày đã chấm đủ. Chữ N giữ phần "vì sao không cần làm gì".
    expect(oLichNgay(undefined, 'nghi')).toEqual({ mau: 'xanh', kyHieu: 'N' });
    expect(oLichNgay([], 'nghi')).toEqual({ mau: 'xanh', kyHieu: 'N' });
  });

  it('ngày lễ → xanh kèm chữ L, khớp ký hiệu bảng công', () => {
    expect(oLichNgay([], 'le')).toEqual({ mau: 'xanh', kyHieu: 'L' });
  });

  it('đi làm ngày nghỉ → hiện theo BẢN GHI thật, không đè N', () => {
    // Công sức đi làm thứ Bảy không được biến mất khỏi lịch chỉ vì hôm đó
    // được xếp là ngày nghỉ.
    expect(
      oLichNgay([banGhi('2026-07-25', 'vao'), banGhi('2026-07-25', 'ra')], 'nghi')
    ).toEqual({ mau: 'xanh', kyHieu: null });
    expect(oLichNgay([banGhi('2026-07-25', 'vao')], 'nghi')).toEqual({
      mau: 'do',
      kyHieu: null,
    });
  });

  it('ngày làm việc giữ nguyên hành vi cũ', () => {
    expect(
      oLichNgay([banGhi('2026-07-20', 'vao'), banGhi('2026-07-20', 'ra')], undefined)
    ).toEqual({ mau: 'xanh', kyHieu: null });
    expect(oLichNgay([banGhi('2026-07-20', 'vao')], undefined)).toEqual({
      mau: 'do',
      kyHieu: null,
    });
  });

  it('ngày làm việc không có bản ghi → XÁM, đây mới là ngày quên chấm', () => {
    expect(oLichNgay(undefined, undefined)).toEqual({ mau: 'xam', kyHieu: null });
    expect(oLichNgay([], undefined)).toEqual({ mau: 'xam', kyHieu: null });
  });
});

describe('trangThaiTheoNgay', () => {
  it('dựng map ngay -> loai từ danh sách backend trả về', () => {
    const kq = trangThaiTheoNgay([
      { ngay: '2026-07-25', loai: 'nghi' },
      { ngay: '2026-07-22', loai: 'le' },
    ]);

    expect(kq['2026-07-25']).toBe('nghi');
    expect(kq['2026-07-22']).toBe('le');
    expect(kq['2026-07-20']).toBeUndefined();
  });

  it('danh sách rỗng (lỗi mạng, chưa cấu hình lịch) → map rỗng, lịch về hành vi cũ', () => {
    expect(trangThaiTheoNgay([])).toEqual({});
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
