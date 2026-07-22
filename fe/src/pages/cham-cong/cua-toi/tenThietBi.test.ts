import { describe, it, expect } from 'vitest';
import { tenThietBiMacDinh, DAI_NHAT_TEN_THIET_BI } from './tenThietBi';

describe('tenThietBiMacDinh', () => {
  it('iPhone / Safari', () => {
    expect(
      tenThietBiMacDinh(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('iPhone · Safari');
  });

  it('Android / Chrome', () => {
    expect(
      tenThietBiMacDinh(
        'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('Android · Chrome');
  });

  it('Windows / Edge — Edge phải thắng Chrome vì UA của Edge chứa cả "Chrome"', () => {
    expect(
      tenThietBiMacDinh(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
      ),
    ).toBe('Windows · Edge');
  });

  it('macOS / Chrome — Safari trong UA của Chrome không được thắng', () => {
    expect(
      tenThietBiMacDinh(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      ),
    ).toBe('macOS · Chrome');
  });

  it('iPad', () => {
    expect(
      tenThietBiMacDinh(
        'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Safari/604.1',
      ),
    ).toBe('iPad · Safari');
  });

  it('UA lạ / rỗng → vẫn ra một cái tên dùng được, không rỗng', () => {
    expect(tenThietBiMacDinh('')).toBe('Thiết bị không rõ');
    expect(tenThietBiMacDinh(undefined)).toBe('Thiết bị không rõ');
    expect(tenThietBiMacDinh('curl/8.4.0')).toBe('Thiết bị không rõ');
  });

  it('không bao giờ dài quá giới hạn — tên này hiện trong bảng hàng chờ của HR', () => {
    const dai = tenThietBiMacDinh(`Mozilla/5.0 (iPhone) ${'x'.repeat(500)} Safari/604.1`);
    expect(dai.length).toBeLessThanOrEqual(DAI_NHAT_TEN_THIET_BI);
  });
});
