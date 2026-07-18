import { describe, it, expect } from 'vitest';
import type { BaoCaoHopDongRow } from '@/types';
import { filterHopDong, sumHopDong } from './hopDongFilter';

const row = (nam: number | null, soLuong: number, giaTri: number): BaoCaoHopDongRow => ({
  nam,
  soLuong,
  giaTri,
  quyetToan: giaTri / 2,
  thuTien: giaTri / 4,
  chuaCoHD: 1,
  hdChuaKy: 0,
  hdPhotoScan: 0,
  hdGoc: soLuong - 1,
  giaTriBinhQuan: soLuong ? giaTri / soLuong : 0,
});

const rows: BaoCaoHopDongRow[] = [
  row(2023, 2, 200),
  row(2024, 3, 600),
  row(null, 1, 100), // "Chưa rõ"
];

// Số gốc BE — cố tình lệch để thấy khi nào tính lại.
const tong: BaoCaoHopDongRow = { ...row(null, 6, 900), giaTriBinhQuan: 150 };

describe('sumHopDong', () => {
  it('cộng dồn các cột số, bình quân = tổng giá trị / tổng số lượng', () => {
    const t = sumHopDong(rows);
    expect(t.soLuong).toBe(6);
    expect(t.giaTri).toBe(900);
    expect(t.quyetToan).toBe(450);
    expect(t.chuaCoHD).toBe(3);
    expect(t.giaTriBinhQuan).toBe(150);
  });

  it('không có dòng nào → toàn 0, không chia cho 0', () => {
    const t = sumHopDong([]);
    expect(t.soLuong).toBe(0);
    expect(t.giaTriBinhQuan).toBe(0);
  });
});

describe('filterHopDong', () => {
  it('không lọc → giữ nguyên dòng và dòng Tổng của backend', () => {
    const out = filterHopDong(rows, tong, { nam: { kind: 'text', op: 'contains', value: '' } });
    expect(out.rows).toBe(rows);
    expect(out.tong).toBe(tong);
  });

  it('lọc còn 1 năm: dòng Tổng bằng đúng năm đó', () => {
    const out = filterHopDong(rows, tong, { nam: { kind: 'text', op: 'equals', value: '2024' } });
    expect(out.rows.map((r) => r.nam)).toEqual([2024]);
    expect(out.tong).toMatchObject({ soLuong: 3, giaTri: 600, giaTriBinhQuan: 200 });
  });

  it('lọc nhiều năm: Tổng cộng dồn các dòng còn hiện', () => {
    const out = filterHopDong(rows, tong, { nam: { kind: 'text', op: 'startsWith', value: '202' } });
    expect(out.rows).toHaveLength(2);
    expect(out.tong).toMatchObject({ soLuong: 5, giaTri: 800, giaTriBinhQuan: 160 });
  });

  it('lọc được dòng năm rỗng qua nhãn "Chưa rõ" (bỏ dấu, không phân biệt hoa thường)', () => {
    const out = filterHopDong(rows, tong, { nam: { kind: 'text', op: 'contains', value: 'chua ro' } });
    expect(out.rows.map((r) => r.nam)).toEqual([null]);
    expect(out.tong).toMatchObject({ soLuong: 1, giaTri: 100 });
  });

  it('lọc không khớp gì → bảng rỗng, không hiện dòng Tổng', () => {
    const out = filterHopDong(rows, tong, { nam: { kind: 'text', op: 'equals', value: '1999' } });
    expect(out.rows).toEqual([]);
    expect(out.tong).toBeNull();
  });
});

describe('lọc cột số', () => {
  it('lọc "Số tiền ≥ 1 tỷ" và cộng lại dòng Tổng theo các năm còn hiện', () => {
    const numRows = [row(2024, 2, 2_000_000_000), row(2025, 1, 500_000_000)];
    const numTong = row(null, 3, 2_500_000_000);

    const view = filterHopDong(numRows, numTong, {
      giaTri: { kind: 'number', op: 'gte', value: '1.000.000.000' },
    });

    expect(view.rows.map((r) => r.nam)).toEqual([2024]);
    expect(view.tong!.giaTri).toBe(2_000_000_000);
    expect(view.tong!.soLuong).toBe(2);
    expect(view.tong!.giaTriBinhQuan).toBe(1_000_000_000);
  });

  it('(Không trống) trên cột HĐ gốc bỏ năm có HĐ gốc = 0', () => {
    const numRows = [
      { ...row(2024, 1, 100), hdGoc: 0 },
      { ...row(2025, 1, 100), hdGoc: 3 },
    ];
    const view = filterHopDong(numRows, null, {
      hdGoc: { kind: 'number', op: 'notBlank', value: '' },
    });
    expect(view.rows.map((r) => r.nam)).toEqual([2025]);
  });
});
