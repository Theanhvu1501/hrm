import { AuthzLoaderService } from './authz-loader.service';
import { SUPER_ADMIN_EMAIL } from '@app/entities';

function fakeDataSource(opts: { appUserRole?: any; phanQuyen?: any }) {
  return {
    getRepository: (entity: any) => ({
      findOne: async () => {
        const name = entity?.name || entity;
        if (String(name).includes('AppUserRole')) return opts.appUserRole ?? null;
        if (String(name).includes('PhanQuyen')) return opts.phanQuyen ?? null;
        return null;
      },
    }),
  } as any;
}

function spyDataSource(opts: { appUserRole?: any; phanQuyen?: any }) {
  const phanQuyenCalls: number[] = [];
  const ds = {
    getRepository: (entity: any) => {
      const name = entity?.name || entity;
      if (String(name).includes('PhanQuyen')) {
        return {
          findOne: async () => {
            phanQuyenCalls.push(1);
            return opts.phanQuyen ?? null;
          },
        };
      }
      return {
        findOne: async () => opts.appUserRole ?? null,
      };
    },
  } as any;
  return { ds, phanQuyenCalls };
}

describe('AuthzLoaderService', () => {
  it('super admin theo email → SUPER_ADMIN + [*]', async () => {
    const svc = new AuthzLoaderService(fakeDataSource({}));
    const r = await svc.load('u1', 't1', SUPER_ADMIN_EMAIL);
    expect(r).toEqual({ vaiTro: 'SUPER_ADMIN', permissions: ['*'] });
  });

  it('user thường → vaiTro từ app_user_roles, permissions từ phan_quyen', async () => {
    const svc = new AuthzLoaderService(
      fakeDataSource({
        appUserRole: { role: 'Admin' },
        phanQuyen: { permissions: ['/chung-tu/phieu-thu:xem', '/chung-tu/phieu-thu:them'] },
      }),
    );
    const r = await svc.load('u1', 't1', 'user@x.com');
    expect(r.vaiTro).toBe('Admin');
    expect(r.permissions).toContain('/chung-tu/phieu-thu:xem');
  });

  it("không có app_user_roles → '' + [] (không kế thừa KIEM_SOAT)", async () => {
    const { ds, phanQuyenCalls } = spyDataSource({});
    const svc = new AuthzLoaderService(ds);
    const r = await svc.load('u1', 't1', 'user@x.com');
    expect(r).toEqual({ vaiTro: '', permissions: [] });
    expect(phanQuyenCalls).toHaveLength(0); // phan_quyen KHÔNG được query
  });

  it('app_user_roles có nhưng role rỗng → fallback KIEM_SOAT', async () => {
    const svc = new AuthzLoaderService(
      fakeDataSource({
        appUserRole: { role: '' },
        phanQuyen: { permissions: ['/bao-cao:xem'] },
      }),
    );
    const r = await svc.load('u1', 't1', 'user@x.com');
    expect(r.vaiTro).toBe('KIEM_SOAT');
    expect(r.permissions).toContain('/bao-cao:xem');
  });

  it('cache: lần 2 không gọi lại findOne', async () => {
    let calls = 0;
    const ds: any = {
      getRepository: () => ({ findOne: async () => { calls++; return null; } }),
    };
    const svc = new AuthzLoaderService(ds);
    await svc.load('u1', 't1', 'user@x.com');
    const before = calls;
    await svc.load('u1', 't1', 'user@x.com');
    expect(calls).toBe(before); // hit cache
  });

  it('lỗi DB KHÔNG cache — lần sau retry', async () => {
    let calls = 0;
    const ds: any = { getRepository: () => ({ findOne: async () => { calls++; throw new Error('db down'); } }) };
    const svc = new AuthzLoaderService(ds);
    const r1 = await svc.load('u1', 't1', 'user@x.com');
    expect(r1).toEqual({ vaiTro: '', permissions: [] });
    const after1 = calls;
    await svc.load('u1', 't1', 'user@x.com');
    expect(calls).toBeGreaterThan(after1); // đã retry, không dùng cache lỗi
  });
});
