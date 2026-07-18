import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { TenantAppConfig } from '@app/entities';
import { NganhService } from './nganh.service';

function mockRepo(initial: any[] = []) {
  const store = [...initial];
  return {
    store,
    find: jest.fn(async () => store),
    findOne: jest.fn(async ({ where }: any) => {
      if (where.code) return store.find((x) => x.code === where.code) ?? null;
      if (where._id) return store.find((x) => String(x._id) === String(where._id)) ?? null;
      return null;
    }),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => { store.push(x); return x; }),
    remove: jest.fn(async (x: any) => { const i = store.indexOf(x); if (i >= 0) store.splice(i, 1); }),
    count: jest.fn(async () => store.length),
  } as any;
}

describe('NganhService', () => {
  let service: NganhService;
  let nganhRepo: any;
  let tenantAppConfigRepo: any;

  beforeEach(async () => {
    nganhRepo = mockRepo();
    tenantAppConfigRepo = mockRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NganhService,
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`, useValue: nganhRepo },
        { provide: getRepositoryToken(TenantAppConfig), useValue: tenantAppConfigRepo },
      ],
    }).compile();
    service = moduleRef.get(NganhService);
  });

  it('create chặn trùng code', async () => {
    await service.create({ code: 'XAY_DUNG', name: 'Xây dựng' } as any);
    await expect(
      service.create({ code: 'XAY_DUNG', name: 'XD 2' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('create gán glossary mặc định {} nếu không truyền', async () => {
    const created = await service.create({ code: 'MAM_NON', name: 'Mầm non' } as any);
    expect(created.glossary).toEqual({});
  });

  it('delete chặn khi còn tenant dùng ngành', async () => {
    const created = await service.create({ code: 'XAY_DUNG', name: 'Xây dựng' } as any);
    tenantAppConfigRepo.store.push({ tenantId: 't1', nganh: 'XAY_DUNG' });
    await expect(service.delete(String(created._id))).rejects.toBeInstanceOf(ConflictException);
  });
});
