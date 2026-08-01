import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService, AuthzLoaderService } from '@app/auth';
import { QuyGio_Controller } from './quy-gio.controller';
import { QuyGio_Service } from './quy-gio.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';

describe('QuyGio_Controller', () => {
  const quyGio = {
    soDuKhaDung: jest
      .fn()
      .mockResolvedValue({ soGioConLai: 12, theoKy: [] }),
    layQuyCuaNhanVien: jest.fn().mockResolvedValue([]),
    dongQuyGio: jest
      .fn()
      .mockResolvedValue({ soQuyDong: 0, soGioHetHan: 0, soGioChoTraTien: 0 }),
    xemTruocDongQuy: jest.fn().mockResolvedValue([]),
    doiSoat: jest.fn().mockResolvedValue([]),
  };
  const nhanVien = {
    resolveEmployeeFromUser: jest
      .fn()
      .mockResolvedValue({ _id: { toString: () => 'nv1' } }),
  };

  async function dungController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [QuyGio_Controller],
      providers: [
        { provide: QuyGio_Service, useValue: quyGio },
        { provide: NhanVien_Service, useValue: nhanVien },
        // Test gọi thẳng method của controller, không đi qua HTTP nên
        // JwtGuard/PermissionGuard không thực sự canActivate() — nhưng Nest
        // vẫn resolve chúng lúc compile() vì chúng đứng ở @UseGuards cấp
        // class/route, nên hai dependency của JwtGuard vẫn phải có mặt trong
        // DI container dù không được gọi tới (xem quy-phep.controller.spec.ts).
        { provide: JwtService, useValue: {} },
        { provide: AuthzLoaderService, useValue: {} },
      ],
    }).compile();
    return moduleRef.get(QuyGio_Controller);
  }

  beforeEach(() => jest.clearAllMocks());

  // Controller đọc `req.user` (do JwtGuard gán vào request thật), không phải
  // id trực tiếp — khớp quy ước `nhanVien_Service.resolveEmployeeFromUser(req.user)`
  // dùng xuyên suốt các controller chấm công khác trong repo.

  it('cua-toi/so-du suy employeeId TỪ TOKEN, bỏ qua employeeId client gửi kèm ở query', async () => {
    const controller = await dungController();
    await controller.soDuCuaToi({
      user: { id: 'u1' },
      query: { employeeId: 'nv-khac' },
    } as any);

    expect(nhanVien.resolveEmployeeFromUser).toHaveBeenCalledWith({
      id: 'u1',
    });
    expect(quyGio.soDuKhaDung).toHaveBeenCalledWith('nv1', expect.any(String));
  });

  it('cua-toi/so-du: token thiếu id thì ném UnauthorizedException, KHÔNG mặc định về chuỗi rỗng', async () => {
    const controller = await dungController();
    await expect(
      controller.soDuCuaToi({ user: {} } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(nhanVien.resolveEmployeeFromUser).not.toHaveBeenCalled();
    expect(quyGio.soDuKhaDung).not.toHaveBeenCalled();
  });

  it('danh-sach không truyền employeeId trả mảng rỗng, không gọi service', async () => {
    const controller = await dungController();
    expect(await controller.danhSach(undefined)).toEqual({
      success: true,
      data: [],
    });
    expect(quyGio.layQuyCuaNhanVien).not.toHaveBeenCalled();
  });

  it('danh-sach có employeeId gọi service với đúng employeeId', async () => {
    const controller = await dungController();
    await controller.danhSach('nv2');
    expect(quyGio.layQuyCuaNhanVien).toHaveBeenCalledWith('nv2');
  });

  it('so-du (quản trị) gọi service với employeeId từ param', async () => {
    const controller = await dungController();
    await controller.soDu('nv3');
    expect(quyGio.soDuKhaDung).toHaveBeenCalledWith('nv3', expect.any(String));
  });

  // Sổ biến động ghi lại AI đóng quỹ — actor rỗng là lỗ hổng audit trail
  // (xem comment trong `dongQuy()` ở controller), cùng lớp lỗi mà
  // `cua-toi/so-du` đã chặn ở trên. Vế "không gọi service" quan trọng ngang
  // vế "ném lỗi": ném lỗi mà vẫn lỡ gọi service rồi mới ném thì đã kịp ghi sổ
  // với actor rỗng — đúng cái hố mà bài test này tồn tại để chặn.
  it('dong-quy: token thiếu id thì ném UnauthorizedException, KHÔNG gọi service', async () => {
    const controller = await dungController();
    await expect(
      controller.dongQuy({ den: '2026-02-01' } as any, { user: {} } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(quyGio.dongQuyGio).not.toHaveBeenCalled();
  });

  /**
   * (review nhánh, CRITICAL 1) Các bài test phía trên chỉ khẳng định ĐÃ GỌI
   * ĐÚNG service — chúng xanh y nguyên kể cả khi handler trả object THÔ, và
   * đó chính là lý do lỗi này sống qua 14 vòng review task. Config-service
   * KHÔNG có interceptor bọc phản hồi (`main.ts` chỉ cài `LoggingInterceptor`,
   * một `tap()` không biến đổi gì), còn FE `ServiceBase.parseResponse()` kết
   * thúc bằng `return response.data as T` — nên hình dạng TRẢ VỀ mới là hợp
   * đồng thật giữa hai bên, và phải được kiểm trực tiếp.
   *
   * Kiểm `data` bằng `toEqual` trên object đầy đủ (không phải
   * `toHaveProperty('success')`): một handler quên bọc vẫn có thể tình cờ có
   * key `success` nếu service trả về nó, còn `toEqual` thì bắt cả hai vế.
   */
  describe('mọi handler PHẢI trả { success: true, data } — FE bóc đúng ô data', () => {
    it('cua-toi/so-du', async () => {
      const controller = await dungController();
      expect(
        await controller.soDuCuaToi({ user: { id: 'u1' } } as any),
      ).toEqual({ success: true, data: { soGioConLai: 12, theoKy: [] } });
    });

    it('danh-sach (có employeeId)', async () => {
      const controller = await dungController();
      quyGio.layQuyCuaNhanVien.mockResolvedValueOnce([{ kyTich: '2026-01' }]);
      expect(await controller.danhSach('nv2')).toEqual({
        success: true,
        data: [{ kyTich: '2026-01' }],
      });
    });

    it('so-du (quản trị)', async () => {
      const controller = await dungController();
      expect(await controller.soDu('nv3')).toEqual({
        success: true,
        data: { soGioConLai: 12, theoKy: [] },
      });
    });

    it('xem-truoc-dong-quy', async () => {
      const controller = await dungController();
      expect(await controller.xemTruocDongQuy('2026-02-01')).toEqual({
        success: true,
        data: [],
      });
    });

    it('dong-quy', async () => {
      const controller = await dungController();
      expect(
        await controller.dongQuy({ den: '2026-02-01' } as any, {
          user: { id: 'u1' },
        } as any),
      ).toEqual({
        success: true,
        data: { soQuyDong: 0, soGioHetHan: 0, soGioChoTraTien: 0 },
      });
    });

    it('doi-soat', async () => {
      const controller = await dungController();
      quyGio.doiSoat.mockResolvedValueOnce([
        { kyTich: '2026-01', theoSo: 8, theoSoDu: 8, lech: 0 },
      ]);
      expect(await controller.doiSoat('nv3')).toEqual({
        success: true,
        data: [{ kyTich: '2026-01', theoSo: 8, theoSoDu: 8, lech: 0 }],
      });
    });
  });
});
