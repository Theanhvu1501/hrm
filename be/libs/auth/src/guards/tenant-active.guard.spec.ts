import { ExecutionContext } from '@nestjs/common';
import { TenantActiveGuard } from './tenant-active.guard';

function ctx(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('TenantActiveGuard', () => {
  let guard: TenantActiveGuard;

  beforeEach(() => {
    // Guard không còn inject DB — khởi tạo không cần arg
    guard = new TenantActiveGuard();
  });

  it('user có tenantId → true (identity chỉ phát hành token cho tenant active)', () => {
    expect(guard.canActivate(ctx({ tenantId: 'tenant-1', email: 'a@b.com' }))).toBe(true);
  });

  it('không có user → true (skip, để JwtGuard xử lý)', () => {
    expect(guard.canActivate(ctx(undefined))).toBe(true);
  });

  it('user không có tenantId → true (super admin hoặc unauthenticated)', () => {
    expect(guard.canActivate(ctx({ email: 'admin@company.com' }))).toBe(true);
  });
});
