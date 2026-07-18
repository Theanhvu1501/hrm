import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SUPER_ADMIN_EMAIL } from '@app/entities';
import { TenantAdminGuard } from './tenant-admin.guard';

const TENANT_ID = 'tenant-1';

function ctx(user: any, params: any = { id: TENANT_ID }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
  } as unknown as ExecutionContext;
}

describe('TenantAdminGuard', () => {
  let guard: TenantAdminGuard;

  beforeEach(() => {
    // Guard không còn inject DB — khởi tạo không cần arg
    guard = new TenantAdminGuard();
  });

  it('super admin → true (bypass mọi tenant)', () => {
    expect(
      guard.canActivate(ctx({ email: SUPER_ADMIN_EMAIL, id: 'u1', tenantId: undefined })),
    ).toBe(true);
  });

  it('membershipRole="admin" và params.id === user.tenantId → true', () => {
    expect(
      guard.canActivate(
        ctx({ email: 'a@b.com', id: 'u1', tenantId: TENANT_ID, membershipRole: 'admin' }),
      ),
    ).toBe(true);
  });

  it('membershipRole="admin" nhưng params.id !== user.tenantId → ForbiddenException (chống leo quyền chéo tenant)', () => {
    expect(() =>
      guard.canActivate(
        ctx({ email: 'a@b.com', id: 'u1', tenantId: 'other-tenant', membershipRole: 'admin' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('membershipRole="member" → ForbiddenException', () => {
    expect(() =>
      guard.canActivate(
        ctx({ email: 'a@b.com', id: 'u1', tenantId: TENANT_ID, membershipRole: 'member' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('không có params.id → ForbiddenException', () => {
    expect(() =>
      guard.canActivate(
        ctx(
          { email: 'a@b.com', id: 'u1', tenantId: TENANT_ID, membershipRole: 'admin' },
          {},
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('không có user → ForbiddenException', () => {
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
