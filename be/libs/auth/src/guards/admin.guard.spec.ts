import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  const ctx = (user: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it('allows tenant admin (case-insensitive — real data uses "Admin")', () => {
    expect(guard.canActivate(ctx({ vaiTro: 'ADMIN' }))).toBe(true);
    expect(guard.canActivate(ctx({ vaiTro: 'Admin' }))).toBe(true);
    expect(guard.canActivate(ctx({ vaiTro: 'admin' }))).toBe(true);
  });

  it('allows super admin', () => {
    expect(guard.canActivate(ctx({ vaiTro: 'SUPER_ADMIN' }))).toBe(true);
  });

  it('denies non-admin roles', () => {
    for (const vaiTro of [
      'KE_TOAN_TRUONG',
      'KE_TOAN_QUY',
      'KE_TOAN_CONG_NO',
      'KE_TOAN_TONG_HOP',
      'MANAGER',
      'KIEM_SOAT',
      'GIAM_DOC',
    ]) {
      expect(() => guard.canActivate(ctx({ vaiTro }))).toThrow(
        ForbiddenException,
      );
    }
  });

  it('denies when user is missing', () => {
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
