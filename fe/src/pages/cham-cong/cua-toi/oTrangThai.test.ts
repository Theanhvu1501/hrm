import { describe, it, expect } from 'vitest';
import { baOTrangThai } from './oTrangThai';
import {
  AttendanceRecord,
  TrangThaiHomNay,
} from '@/services/attendanceRecordService';

function banGhi(over: Partial<AttendanceRecord>): AttendanceRecord {
  return {
    id: 'r1',
    employeeId: 'emp-1',
    ngay: '2026-07-23',
    loai: 'vao',
    thoiDiem: '2026-07-23T01:02:00.000Z', // 08:02 giờ VN
    ngoaiVung: false,
    soPhutDiMuon: 0,
    soPhutVeSom: 0,
    laNgayNghi: false,
    nguonTao: 'tu_cham',
    ...over,
  };
}

function homNay(over: Partial<TrangThaiHomNay> = {}): TrangThaiHomNay {
  return {
    ngay: '2026-07-23',
    ngayCong: '2026-07-23',
    nhanVien: { id: 'emp-1', hoTen: 'Nguyễn Văn Hải', employeeCode: 'NV0001' },
    ca: null,
    diaDiem: [],
    soCong: 0,
    hanhDongKeTiep: 'vao',
    banGhi: [],
    ...over,
  };
}

describe('baOTrangThai', () => {
  it('chưa chấm gì: ba ô đều đỏ, giờ hiện --:--, công hiện 0', () => {
    const [vao, ra, cong] = baOTrangThai(homNay());

    expect(vao).toEqual({ nhan: 'Giờ vào', giaTri: '--:--', ghiChu: 'Chưa chấm', xanh: false });
    expect(ra).toEqual({ nhan: 'Giờ ra', giaTri: '--:--', ghiChu: 'Chưa chấm', xanh: false });
    expect(cong).toEqual({ nhan: 'Công', giaTri: '0', ghiChu: 'Chưa tính', xanh: false });
  });

  it('mới chấm vào đúng giờ: ô vào xanh, ô công hiện "—" và "Chờ ra"', () => {
    const [vao, ra, cong] = baOTrangThai(
      homNay({ banGhi: [banGhi({ loai: 'vao' })], soCong: null })
    );

    expect(vao.giaTri).toBe('08:02');
    expect(vao.ghiChu).toBe('Đúng giờ');
    expect(vao.xanh).toBe(true);
    expect(ra.xanh).toBe(false);
    expect(cong).toEqual({ nhan: 'Công', giaTri: '—', ghiChu: 'Chờ ra', xanh: false });
  });

  it('vào muộn: ghi chú nói rõ số phút', () => {
    const [vao] = baOTrangThai(
      homNay({ banGhi: [banGhi({ loai: 'vao', soPhutDiMuon: 2 })], soCong: null })
    );

    expect(vao.ghiChu).toBe('Muộn 2 phút');
  });

  it('đủ vào và ra: ba ô đều xanh, công hiện 1', () => {
    const [vao, ra, cong] = baOTrangThai(
      homNay({
        banGhi: [
          banGhi({ id: 'r1', loai: 'vao', soPhutDiMuon: 2 }),
          banGhi({ id: 'r2', loai: 'ra', thoiDiem: '2026-07-23T10:05:00.000Z' }),
        ],
        soCong: 1,
      })
    );

    expect(vao.xanh).toBe(true);
    expect(ra.giaTri).toBe('17:05');
    expect(ra.ghiChu).toBe('Đúng giờ');
    expect(ra.xanh).toBe(true);
    expect(cong).toEqual({ nhan: 'Công', giaTri: '1', ghiChu: 'Đủ công', xanh: true });
  });

  it('về sớm: ghi chú nói rõ số phút', () => {
    const [, ra] = baOTrangThai(
      homNay({
        banGhi: [
          banGhi({ id: 'r1', loai: 'vao' }),
          banGhi({ id: 'r2', loai: 'ra', thoiDiem: '2026-07-23T09:00:00.000Z', soPhutVeSom: 60 }),
        ],
        soCong: 1,
      })
    );

    expect(ra.ghiChu).toBe('Sớm 60 phút');
  });

  /**
   * Ca qua đêm hoặc chấm nhầm rồi chấm lại: nhiều lượt vào, nhiều lượt ra.
   * Lấy lượt vào ĐẦU TIÊN và lượt ra CUỐI CÙNG — đó là biên thật của ngày
   * công. Lấy ngược lại sẽ báo giờ vào muộn hơn giờ ra.
   */
  it('nhiều lượt: lấy vào đầu tiên và ra cuối cùng', () => {
    const [vao, ra] = baOTrangThai(
      homNay({
        banGhi: [
          banGhi({ id: 'r1', loai: 'vao', thoiDiem: '2026-07-23T01:00:00.000Z' }),
          banGhi({ id: 'r2', loai: 'ra', thoiDiem: '2026-07-23T05:00:00.000Z' }),
          banGhi({ id: 'r3', loai: 'vao', thoiDiem: '2026-07-23T06:00:00.000Z' }),
          banGhi({ id: 'r4', loai: 'ra', thoiDiem: '2026-07-23T10:00:00.000Z' }),
        ],
        soCong: 1,
      })
    );

    expect(vao.giaTri).toBe('08:00');
    expect(ra.giaTri).toBe('17:00');
  });
});
