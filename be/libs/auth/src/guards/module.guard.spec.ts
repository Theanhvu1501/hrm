import { ForbiddenException } from '@nestjs/common';
import { ModuleGuard } from './module.guard';

function ctx(headers: Record<string, string>, url = '/api/kho/phieu') {
  const req = { headers, originalUrl: url, url };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
}

describe('ModuleGuard', () => {
  const entitlement = {
    resolveOwningCodes: jest.fn(),
    getTenantModules: jest.fn(),
  } as any;
  const jwtService = { verify: jest.fn() } as any;
  let guard: ModuleGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new ModuleGuard(jwtService, entitlement);
  });

  it('không token → ALLOW', async () => {
    expect(await guard.canActivate(ctx({}))).toBe(true);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('token lỗi → ALLOW (downstream xử lý)', async () => {
    jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
    expect(await guard.canActivate(ctx({ authorization: 'bad' }))).toBe(true);
  });

  it('không tenantId (SuperAdmin/temp) → ALLOW', async () => {
    jwtService.verify.mockReturnValue({ email: 'admin@company.com' });
    expect(await guard.canActivate(ctx({ authorization: 't' }))).toBe(true);
    expect(entitlement.resolveOwningCodes).not.toHaveBeenCalled();
  });

  it('path dùng chung (resolveOwningCodes=null) → ALLOW', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid' });
    entitlement.resolveOwningCodes.mockResolvedValue(null);
    expect(await guard.canActivate(ctx({ authorization: 't' }))).toBe(true);
    expect(entitlement.getTenantModules).not.toHaveBeenCalled();
  });

  it('tenant có lĩnh vực sở hữu → ALLOW', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid' });
    entitlement.resolveOwningCodes.mockResolvedValue(['KHO']);
    entitlement.getTenantModules.mockResolvedValue(['KE_TOAN', 'KHO']);
    expect(await guard.canActivate(ctx({ authorization: 't' }))).toBe(true);
  });

  it('tenant KHÔNG có lĩnh vực → 403', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid' });
    entitlement.resolveOwningCodes.mockResolvedValue(['KHO']);
    entitlement.getTenantModules.mockResolvedValue(['KE_TOAN']);
    await expect(guard.canActivate(ctx({ authorization: 't' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('strip /api prefix khi chuẩn hóa path', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid' });
    entitlement.resolveOwningCodes.mockResolvedValue(null);
    await guard.canActivate(ctx({ authorization: 't' }, '/api/master-data/kho?x=1'));
    expect(entitlement.resolveOwningCodes).toHaveBeenCalledWith('/master-data/kho');
  });

  // C1: SuperAdmin có tenantId vẫn bypass hoàn toàn
  it('C1: SuperAdmin có tenantId → ALLOW, resolveOwningCodes KHÔNG được gọi', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid', email: 'admin@company.com' });
    expect(await guard.canActivate(ctx({ authorization: 't' }))).toBe(true);
    expect(entitlement.resolveOwningCodes).not.toHaveBeenCalled();
    expect(entitlement.getTenantModules).not.toHaveBeenCalled();
  });

  // I2: URL encoding bypass - path encoded phải được decode trước khi strip /api
  it('I2: URL encoded path /api/master-data%2fkho → resolveOwningCodes được gọi với /master-data/kho', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid' });
    entitlement.resolveOwningCodes.mockResolvedValue(null);
    await guard.canActivate(ctx({ authorization: 't' }, '/api/master-data%2fkho'));
    expect(entitlement.resolveOwningCodes).toHaveBeenCalledWith('/master-data/kho');
  });

  it('I2: double slash /api//master-data/kho → resolveOwningCodes được gọi với /master-data/kho', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid' });
    entitlement.resolveOwningCodes.mockResolvedValue(null);
    await guard.canActivate(ctx({ authorization: 't' }, '/api//master-data/kho'));
    expect(entitlement.resolveOwningCodes).toHaveBeenCalledWith('/master-data/kho');
  });
});
