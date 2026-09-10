import { describe, it, expect } from 'vitest';
import { layMauApp, quyCachO, MAU_APP } from '../quyCachIconApp';

describe('quyCachO', () => {
  it('bo góc 27% cạnh, glyph 55% cạnh', () => {
    expect(quyCachO('ke-toan', 88).boGoc).toBe(24); // 88 * 0.27 = 23.76
    expect(quyCachO('ke-toan', 88).glyph).toBe(48); // 88 * 0.55 = 48.4
    expect(quyCachO('ke-toan', 64).boGoc).toBe(17); // 64 * 0.27 = 17.28
    expect(quyCachO('ke-toan', 28).glyph).toBe(15); // 28 * 0.55 = 15.4
  });

  it('từ 24px trở lên: gradient 305° + lớp sáng radial', () => {
    const { nen } = quyCachO('ke-toan', 24);
    expect(nen).toContain('linear-gradient(305deg');
    expect(nen).toContain('radial-gradient');
    expect(nen).toContain('#1FD1A3');
    expect(nen).toContain('#0E7490');
  });

  it('dưới 24px: bỏ gradient và lớp sáng, dùng màu đầu đặc', () => {
    const { nen } = quyCachO('ke-toan', 20);
    expect(nen).toBe('#1FD1A3');
    expect(nen).not.toContain('gradient');
  });

  it('bóng ô: 0 5 14, màu cuối ở 40%', () => {
    expect(quyCachO('giao-viec', 64).bong).toBe('0 5px 14px #7C3AED66');
  });

  it('appId lạ KHÔNG được mượn màu của app khác', () => {
    const la = layMauApp('khong-ton-tai');
    const mauCuaApp = Object.values(MAU_APP).flatMap((m) => [m.dau, m.cuoi]);
    expect(mauCuaApp).not.toContain(la.dau);
    expect(mauCuaApp).not.toContain(la.cuoi);
  });

  it('ba app đang có đều tra ra đúng màu của mình', () => {
    expect(layMauApp('ke-toan').dau).toBe('#1FD1A3');
    expect(layMauApp('giao-viec').dau).toBe('#4F8CFF');
    expect(layMauApp('nhan-su').dau).toBe('#FFA63D');
  });
});
