import { PhongBanService } from './phong-ban.service';

function makeService(data: unknown) {
  const identityClient = {
    listDepartments: jest.fn().mockResolvedValue({ data }),
  };
  return { svc: new PhongBanService(identityClient as any), identityClient };
}

describe('PhongBanService.list', () => {
  it('chuyển tiếp token và ánh xạ đúng các trường cần dùng', async () => {
    const { svc, identityClient } = makeService([
      {
        id: 'd1',
        tenantId: 't1',
        maPhong: 'KT',
        tenPhong: 'Kế toán',
        parentId: null,
        path: [],
        truongPhongUserId: null,
        thuTu: 0,
        isActive: true,
      },
    ]);

    const rows = await svc.list('Bearer abc');

    expect(identityClient.listDepartments).toHaveBeenCalledWith('Bearer abc');
    expect(rows).toEqual([
      {
        id: 'd1',
        maPhong: 'KT',
        tenPhong: 'Kế toán',
        parentId: null,
        path: [],
        thuTu: 0,
      },
    ]);
  });

  it('identity trả rỗng thì trả mảng rỗng, không ném lỗi', async () => {
    const { svc } = makeService([]);
    await expect(svc.list('Bearer abc')).resolves.toEqual([]);
  });

  it('identity trả data không phải mảng thì trả mảng rỗng', async () => {
    const { svc } = makeService(null);
    await expect(svc.list('Bearer abc')).resolves.toEqual([]);
  });
});
