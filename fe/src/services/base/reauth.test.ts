import { describe, it, expect, vi } from 'vitest';
import { retryRequestOnce, type ReauthDeps, type RetryableConfig } from './reauth';

function makeDeps(over: Partial<ReauthDeps<string>> = {}): ReauthDeps<string> {
  return {
    resolveTenantId: () => 't1',
    refresh: vi.fn().mockResolvedValue('fresh-token'),
    setToken: vi.fn(),
    replay: vi.fn().mockResolvedValue('REPLAYED'),
    onGiveUp: vi.fn(),
    ...over,
  };
}

describe('retryRequestOnce', () => {
  it('refresh 1 lần rồi replay: set token mới, đánh dấu _retry, trả response replay', async () => {
    const deps = makeDeps();
    const config: RetryableConfig = {};
    const res = await retryRequestOnce(config, deps);
    expect(res).toBe('REPLAYED');
    expect(deps.setToken).toHaveBeenCalledWith('fresh-token');
    expect(config._retry).toBe(true);
    expect(deps.replay).toHaveBeenCalledWith(config);
    expect(deps.onGiveUp).not.toHaveBeenCalled();
  });

  it('không retry lần 2: config đã _retry → onGiveUp, KHÔNG gọi refresh', async () => {
    const deps = makeDeps();
    await expect(retryRequestOnce({ _retry: true }, deps)).rejects.toThrow();
    expect(deps.refresh).not.toHaveBeenCalled();
    expect(deps.onGiveUp).toHaveBeenCalledTimes(1);
  });

  it('thiếu config → onGiveUp, ném lỗi', async () => {
    const deps = makeDeps();
    await expect(retryRequestOnce(undefined, deps)).rejects.toThrow();
    expect(deps.onGiveUp).toHaveBeenCalledTimes(1);
    expect(deps.refresh).not.toHaveBeenCalled();
  });

  it('không có tenantId → onGiveUp, KHÔNG gọi refresh', async () => {
    const deps = makeDeps({ resolveTenantId: () => null });
    await expect(retryRequestOnce({}, deps)).rejects.toThrow();
    expect(deps.refresh).not.toHaveBeenCalled();
    expect(deps.onGiveUp).toHaveBeenCalledTimes(1);
  });

  it('refresh thất bại (null) → onGiveUp, KHÔNG set token, KHÔNG replay', async () => {
    const deps = makeDeps({ refresh: vi.fn().mockResolvedValue(null) });
    await expect(retryRequestOnce({}, deps)).rejects.toThrow();
    expect(deps.setToken).not.toHaveBeenCalled();
    expect(deps.replay).not.toHaveBeenCalled();
    expect(deps.onGiveUp).toHaveBeenCalledTimes(1);
  });
});
