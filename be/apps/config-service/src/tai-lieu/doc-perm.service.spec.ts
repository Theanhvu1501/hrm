import { ForbiddenException } from '@nestjs/common';
import { DocPermService } from './doc-perm.service';

function makeRepo(perms: string[] | null) {
  return {
    findOne: jest.fn().mockResolvedValue(perms ? { permissions: perms } : null),
  } as any;
}

describe('DocPermService', () => {
  it('SuperAdmin (permissions ["*"]) → cho qua, không query DB', async () => {
    const repo = makeRepo(null);
    const svc = new DocPermService(repo);
    await expect(
      svc.assertPerm({ permissions: ['*'] }, 'bieu-mau', 'xem'),
    ).resolves.toBeUndefined();
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('isSuperAdmin true → cho qua, không query DB', async () => {
    const repo = makeRepo(null);
    const svc = new DocPermService(repo);
    await expect(
      svc.assertPerm({ isSuperAdmin: true }, 'bieu-mau', 'xem'),
    ).resolves.toBeUndefined();
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('vai trò có đúng quyền trong DB → cho qua', async () => {
    const repo = makeRepo(['/bieu-mau:xem', '/bieu-mau:them']);
    const svc = new DocPermService(repo);
    await expect(
      svc.assertPerm({ tenantId: 't1', vaiTro: 'Admin' }, 'bieu-mau', 'xem'),
    ).resolves.toBeUndefined();
    expect(repo.findOne).toHaveBeenCalledTimes(1);
  });

  it('vai trò KHÔNG có quyền → 403', async () => {
    const repo = makeRepo(['/huong-dan:xem']);
    const svc = new DocPermService(repo);
    await expect(
      svc.assertPerm({ tenantId: 't1', vaiTro: 'Admin' }, 'bieu-mau', 'xem'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('thiếu tenantId/vaiTro → 403 (không query)', async () => {
    const repo = makeRepo(['*']);
    const svc = new DocPermService(repo);
    await expect(
      svc.assertPerm({ tenantId: 't1' }, 'bieu-mau', 'xem'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('cache: gọi 2 lần cùng (tenant,vaiTro) chỉ query DB 1 lần', async () => {
    const repo = makeRepo(['/bieu-mau:xem']);
    const svc = new DocPermService(repo);
    await svc.assertPerm({ tenantId: 't1', vaiTro: 'Admin' }, 'bieu-mau', 'xem');
    await svc.assertPerm({ tenantId: 't1', vaiTro: 'Admin' }, 'bieu-mau', 'xem');
    expect(repo.findOne).toHaveBeenCalledTimes(1);
  });
});
