// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDeviceId,
  setDeviceIdProvider,
  KHOA_LUU_TRU,
  __resetProviderChoTest,
} from './deviceIdentity';

describe('deviceIdentity', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetProviderChoTest();
  });

  it('sinh id mới khi chưa có', async () => {
    const id = await getDeviceId();

    expect(id).toBeTruthy();
    expect(localStorage.getItem(KHOA_LUU_TRU)).toBe(id);
  });

  it('trả về cùng một id ở các lần gọi sau', async () => {
    const lan1 = await getDeviceId();
    const lan2 = await getDeviceId();

    expect(lan2).toBe(lan1);
  });

  it('dùng lại id đã lưu sẵn trong localStorage', async () => {
    localStorage.setItem(KHOA_LUU_TRU, 'id-co-san');

    expect(await getDeviceId()).toBe('id-co-san');
  });

  it('sinh id mới khi giá trị đã lưu bị rỗng', async () => {
    localStorage.setItem(KHOA_LUU_TRU, '');

    const id = await getDeviceId();

    expect(id).not.toBe('');
    expect(localStorage.getItem(KHOA_LUU_TRU)).toBe(id);
  });

  it('cho phép thay provider — đường nâng cấp lên Capacitor', async () => {
    setDeviceIdProvider({ getDeviceId: async () => 'id-tu-he-dieu-hanh' });

    expect(await getDeviceId()).toBe('id-tu-he-dieu-hanh');
    // Provider ngoài không được ghi vào localStorage của bản web.
    expect(localStorage.getItem(KHOA_LUU_TRU)).toBeNull();
  });

  it('không sập khi localStorage ném lỗi (chế độ riêng tư)', async () => {
    const goc = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError');
    });

    const id = await getDeviceId();
    expect(id).toBeTruthy();

    Storage.prototype.setItem = goc;
  });
});
