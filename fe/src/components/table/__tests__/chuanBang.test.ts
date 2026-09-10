import { describe, it, expect } from 'vitest';
import { tinhScroll } from '../chuanBang';

describe('tinhScroll', () => {
  it('mặc định: cuộn ngang theo nội dung, cao theo bù trừ', () => {
    expect(tinhScroll(285)).toEqual({ x: 'max-content', y: 'calc(100vh - 285px)' });
  });

  it('bù trừ khác thì chỉ đổi chiều cao', () => {
    expect(tinhScroll(400)).toEqual({ x: 'max-content', y: 'calc(100vh - 400px)' });
  });

  it('trang ghi đè x thì giữ y mặc định — không phải khai lại cả cụm', () => {
    expect(tinhScroll(285, { x: 1600 })).toEqual({ x: 1600, y: 'calc(100vh - 285px)' });
  });

  it('trang ghi đè y thì giữ x mặc định', () => {
    expect(tinhScroll(285, { y: 300 })).toEqual({ x: 'max-content', y: 300 });
  });
});
