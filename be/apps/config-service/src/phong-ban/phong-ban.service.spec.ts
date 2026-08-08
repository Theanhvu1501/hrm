import { UnauthorizedException } from '@nestjs/common';
import { PhongBanService } from './phong-ban.service';

function makeService(data: unknown) {
  const identityClient = {
    listDepartments: jest.fn().mockResolvedValue({ success: true, data }),
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

  // identity thất bại (token hỏng, timeout, 5xx...) → BaseServiceClient.createErrorResponse
  // trả { success: false, error: { code, message } }, KHÔNG có `data`. Trước bản vá, việc chỉ
  // kiểm `Array.isArray(res?.data)` khiến shape lỗi này lọt qua branch "danh mục rỗng" — HTTP
  // 200 với data: [] dù identity đang từ chối token. Phải ném lỗi, không được nuốt thành rỗng.
  it('identity trả lỗi (vd token hết hạn) thì ném lỗi, không trả mảng rỗng', async () => {
    const identityClient = {
      listDepartments: jest.fn().mockResolvedValue({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token đã hết hạn' },
      }),
    };
    const svc = new PhongBanService(identityClient as any);

    await expect(svc.list('Bearer abc')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
