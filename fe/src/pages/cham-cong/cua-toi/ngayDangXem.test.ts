import { describe, it, expect } from 'vitest';
import { ngayMacDinhCuaTuan, duLieuNgay } from './ngayDangXem';

describe('ngayMacDinhCuaTuan', () => {
  it('tuần chứa hôm nay → chọn hôm nay', () => {
    expect(ngayMacDinhCuaTuan('2026-07-20', '2026-07-23')).toBe('2026-07-23');
  });

  it('tuần khác → chọn ngày đầu tuần đó', () => {
    expect(ngayMacDinhCuaTuan('2026-07-13', '2026-07-23')).toBe('2026-07-13');
  });
});

describe('duLieuNgay', () => {
  const bg = (ngay: string, loai: string, id = ngay + loai) => ({
    id, employeeId: 'e1', ngay, loai, thoiDiem: `${ngay}T01:00:00.000Z`,
    ngoaiVung: false, soPhutDiMuon: 0, soPhutVeSom: 0, laNgayNghi: false, nguonTao: 'tu_cham',
  }) as any;

  const homNayData: any = {
    ngay: '2026-07-23', ngayCong: '2026-07-23', soCong: 1,
    banGhi: [bg('2026-07-23', 'vao'), bg('2026-07-23', 'ra')],
  };

  /**
   * Hôm nay PHẢI lấy từ homNay chứ không từ banGhiTuan: dải tuần chỉ nạp lại
   * khi đổi tuần, nên ngay sau cú chấm công nó đã cũ.
   */
  it('hôm nay → lấy từ homNay, dùng soCong của backend', () => {
    const kq = duLieuNgay('2026-07-23', '2026-07-23', homNayData, []);
    expect(kq.banGhi).toHaveLength(2);
    expect(kq.soCong).toBe(1);
    expect(kq.laHomNay).toBe(true);
  });

  it('ngày khác → lấy từ banGhiTuan và tự suy soCong', () => {
    const kq = duLieuNgay('2026-07-21', '2026-07-23', homNayData, [
      bg('2026-07-21', 'vao'), bg('2026-07-21', 'ra'), bg('2026-07-22', 'vao'),
    ]);
    expect(kq.banGhi.map((b) => b.ngay)).toEqual(['2026-07-21', '2026-07-21']);
    expect(kq.soCong).toBe(1);
    expect(kq.laHomNay).toBe(false);
  });

  it('ngày khác chỉ có lượt vào → soCong null', () => {
    const kq = duLieuNgay('2026-07-22', '2026-07-23', homNayData, [bg('2026-07-22', 'vao')]);
    expect(kq.soCong).toBeNull();
  });

  it('ngày không có gì → rỗng, soCong 0', () => {
    const kq = duLieuNgay('2026-07-24', '2026-07-23', homNayData, []);
    expect(kq.banGhi).toEqual([]);
    expect(kq.soCong).toBe(0);
  });

  /**
   * `soCong: null` của homNay nghĩa là "đã vào, đang chờ ra" — một giá trị
   * HỢP LỆ, khác hẳn `0` ("chưa có gì để tính", xem oCong() trong
   * oTrangThai.ts). Dùng `homNayData?.soCong ?? 0` sẽ vô tình biến `null`
   * hợp lệ đó thành `0` vì `??` coi `null` là nullish — bug này khiến ô
   * "Công" hiện "Chưa tính" thay vì "Chờ ra" mỗi khi người dùng vừa chấm vào
   * và chưa chấm ra. Chỉ được rơi về 0 khi CHÍNH homNayData là null.
   */
  it('hôm nay chỉ mới vào (soCong null của backend) → giữ nguyên null, KHÔNG rơi về 0', () => {
    const kq = duLieuNgay('2026-07-23', '2026-07-23', { ...homNayData, soCong: null }, []);
    expect(kq.soCong).toBeNull();
  });
});
