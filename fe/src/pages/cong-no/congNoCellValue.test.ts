import { describe, it, expect } from 'vitest';
import { chiTietValue, tongHopThuValue, tongHopTraValue } from './congNoCellValue';

describe('chiTietValue', () => {
  const row = {
    doiTuongId: 'KH01',
    doiTuongTen: 'Khách 1',
    soTienGoc: 1_000_000,
    daThu: 400_000,
    conLai: 600_000,
  };

  it('trả chuỗi cho cột chữ, số cho cột số', () => {
    expect(chiTietValue(row, 'doiTuongId')).toBe('KH01');
    expect(chiTietValue(row, 'doiTuongTen')).toBe('Khách 1');
    expect(chiTietValue(row, 'soTienGoc')).toBe(1_000_000);
    expect(chiTietValue(row, 'daThu')).toBe(400_000);
    expect(chiTietValue(row, 'conLai')).toBe(600_000);
  });

  it('key lạ → undefined', () => {
    expect(chiTietValue(row, 'khongCo')).toBeUndefined();
  });
});

describe('tongHopThuValue', () => {
  const row = {
    doiTuongId: 'KH01',
    doiTuongTen: 'Khách 1',
    soHoaDon: 3,
    tongNo: 1_000_000,
    daThu: 800_000,
    conLai: 200_000,
    quaHan: 0,
  };

  it('cột số và cột tính "Tỷ lệ thu" (%)', () => {
    expect(tongHopThuValue(row, 'soHoaDon')).toBe(3);
    expect(tongHopThuValue(row, 'tongNo')).toBe(1_000_000);
    expect(tongHopThuValue(row, 'daThu')).toBe(800_000);
    expect(tongHopThuValue(row, 'quaHan')).toBe(0);
    expect(tongHopThuValue(row, 'tyLeThu')).toBe(80);
  });

  it('tổng nợ = 0 → tỷ lệ thu = 0', () => {
    expect(tongHopThuValue({ ...row, tongNo: 0, daThu: 0 }, 'tyLeThu')).toBe(0);
  });
});

describe('tongHopTraValue', () => {
  const row = {
    doiTuongId: 'NCC01',
    doiTuongTen: 'NCC 1',
    soHoaDon: 2,
    tongNo: 500_000,
    daTra: 250_000,
    conLai: 250_000,
    quaHan: 100_000,
  };

  it('cột số và cột tính "Tỷ lệ trả" (%)', () => {
    expect(tongHopTraValue(row, 'daTra')).toBe(250_000);
    expect(tongHopTraValue(row, 'quaHan')).toBe(100_000);
    expect(tongHopTraValue(row, 'tyLeTra')).toBe(50);
  });
});
