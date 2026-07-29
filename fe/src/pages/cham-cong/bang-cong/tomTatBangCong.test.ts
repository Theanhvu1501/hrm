import { tomTatThang } from './tomTatBangCong';

const dong = (soOTrong: number, soOCanhBao = 0) =>
  ({ soOTrong, soOCanhBao }) as any;

describe('tomTatThang', () => {
  it('cộng tổng ô trống và ô cảnh báo', () => {
    const t = tomTatThang([dong(2, 5), dong(3, 1)]);
    expect(t.soOTrong).toBe(5);
    expect(t.soOCanhBao).toBe(6);
  });

  it('còn ô trống thì không cho chốt, kèm lý do có số', () => {
    const t = tomTatThang([dong(7)]);
    expect(t.coTheChot).toBe(false);
    expect(t.lyDoKhongChot).toContain('7');
  });

  it('hết ô trống thì cho chốt', () => {
    const t = tomTatThang([dong(0), dong(0)]);
    expect(t.coTheChot).toBe(true);
    expect(t.lyDoKhongChot).toBe('');
  });

  it('bảng rỗng thì không cho chốt', () => {
    const t = tomTatThang([]);
    expect(t.coTheChot).toBe(false);
  });

  it('trường thiếu được coi là 0, không thành NaN', () => {
    const t = tomTatThang([{} as any]);
    expect(t.soOTrong).toBe(0);
    expect(t.coTheChot).toBe(true);
  });
});
