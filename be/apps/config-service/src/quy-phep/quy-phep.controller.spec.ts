import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService, AuthzLoaderService } from '@app/auth';
import { QuyPhep_Controller } from './quy-phep.controller';
import { QuyPhep_Service } from './quy-phep.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';

describe('QuyPhep_Controller', () => {
  const quyPhep = {
    layQuyCuaNhanVien: jest.fn().mockResolvedValue([{ nam: 2026 }]),
    xemTruocCapPhepDauNam: jest.fn().mockResolvedValue([]),
    capPhepDauNam: jest
      .fn()
      .mockResolvedValue({ daCap: 3, daCoQuy: 1, boQuaThuViec: 2 }),
    xemTruocDongQuy: jest.fn().mockResolvedValue([]),
    dongQuy: jest.fn().mockResolvedValue({ soQuyDaDong: 2, tongNgayMat: 5 }),
    dieuChinhTay: jest.fn().mockResolvedValue({}),
  };
  const nhanVien = {
    resolveEmployeeFromUser: jest
      .fn()
      .mockResolvedValue({ _id: { toString: () => 'nv1' } }),
  };

  async function dungController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [QuyPhep_Controller],
      providers: [
        { provide: QuyPhep_Service, useValue: quyPhep },
        { provide: NhanVien_Service, useValue: nhanVien },
        // Test gọi thẳng method của controller, không đi qua HTTP nên
        // JwtGuard/PermissionGuard không thực sự canActivate() — nhưng
        // Nest vẫn resolve chúng lúc compile() vì chúng đứng ở @UseGuards
        // cấp class/route, nên hai dependency của JwtGuard vẫn phải có mặt
        // trong DI container dù không được gọi tới.
        { provide: JwtService, useValue: {} },
        { provide: AuthzLoaderService, useValue: {} },
      ],
    }).compile();
    return moduleRef.get(QuyPhep_Controller);
  }

  beforeEach(() => jest.clearAllMocks());

  // Controller đọc `req.user` (do JwtGuard gán vào request thật), không phải
  // `req` trực tiếp — mock req ở đây phải bọc trong `{ user: {...} }` để
  // đúng hình dạng request thật, khớp quy ước `@Req() req` +
  // `nhanVien_Service.resolveEmployeeFromUser(req.user)` dùng xuyên suốt các
  // controller chấm công khác trong repo (xem don-cham-cong.controller.ts).

  it('cua-toi suy employeeId TỪ TOKEN, bỏ qua giá trị client gửi kèm', async () => {
    const controller = await dungController();
    await controller.cuaToi({ user: { id: 'user1' } } as any);
    expect(quyPhep.layQuyCuaNhanVien).toHaveBeenCalledWith('nv1');
  });

  it('cap-dau-nam với xemTruoc=true KHÔNG ghi gì', async () => {
    const controller = await dungController();
    await controller.capDauNam(
      { nam: 2027, xemTruoc: true },
      { user: { id: 'hr1' } } as any,
    );
    expect(quyPhep.xemTruocCapPhepDauNam).toHaveBeenCalledWith(2027);
    expect(quyPhep.capPhepDauNam).not.toHaveBeenCalled();
  });

  it('dong-quy với xemTruoc=true KHÔNG ghi gì', async () => {
    const controller = await dungController();
    await controller.dongQuy(
      { nam: 2026, xemTruoc: true },
      { user: { id: 'hr1' } } as any,
    );
    expect(quyPhep.xemTruocDongQuy).toHaveBeenCalledWith(2026);
    expect(quyPhep.dongQuy).not.toHaveBeenCalled();
  });

  // Bộ 4 test brief đưa chỉ đi qua nhánh xemTruoc=true của capDauNam/dongQuy —
  // hai test dưới đây khoá luôn nhánh GHI THẬT, để `nguoiThucHien` (đọc từ
  // `req.user`, không phải body) không âm thầm hỏng mà không ai biết.
  it('cap-dau-nam không xemTruoc GHI THẬT với nguoiThucHien từ req.user', async () => {
    const controller = await dungController();
    await controller.capDauNam({ nam: 2027 }, { user: { id: 'hr1' } } as any);
    expect(quyPhep.xemTruocCapPhepDauNam).not.toHaveBeenCalled();
    expect(quyPhep.capPhepDauNam).toHaveBeenCalledWith(2027, 'hr1');
  });

  it('dong-quy không xemTruoc GHI THẬT với nguoiThucHien từ req.user', async () => {
    const controller = await dungController();
    await controller.dongQuy({ nam: 2026 }, { user: { id: 'hr1' } } as any);
    expect(quyPhep.xemTruocDongQuy).not.toHaveBeenCalled();
    expect(quyPhep.dongQuy).toHaveBeenCalledWith(2026, 'hr1');
  });

  it('điều chỉnh truyền người thực hiện từ req.user, không từ body', async () => {
    const controller = await dungController();
    await controller.dieuChinh(
      { employeeId: 'nv1', balanceId: 'q1', soNgay: -1, ghiChu: 'lý do' },
      { user: { id: 'hr1' } } as any,
    );
    expect(quyPhep.dieuChinhTay).toHaveBeenCalledWith(
      'nv1',
      'q1',
      -1,
      'lý do',
      'hr1',
    );
  });

  // (P3.8 review round 4, IMPORTANT 9): `String(req.user?.id ?? '')` cũ mặc
  // định về chuỗi rỗng khi thiếu id, cho phép ghi `nguoiThucHien: ''` vào sổ
  // biến động — lỗ hổng audit trail. Ba route ghi quỹ phải ném lỗi thay vì
  // âm thầm cho qua khi không xác định được người thực hiện.
  describe('actor rỗng bị chặn thay vì mặc định thành chuỗi rỗng', () => {
    it('cap-dau-nam (không xemTruoc) với req.user.id rỗng → ném lỗi, KHÔNG gọi service', async () => {
      const controller = await dungController();
      await expect(
        controller.capDauNam({ nam: 2027 }, { user: {} } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(quyPhep.capPhepDauNam).not.toHaveBeenCalled();
    });

    it('dong-quy (không xemTruoc) với req.user.id rỗng → ném lỗi, KHÔNG gọi service', async () => {
      const controller = await dungController();
      await expect(
        controller.dongQuy({ nam: 2026 }, { user: {} } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(quyPhep.dongQuy).not.toHaveBeenCalled();
    });

    it('dieu-chinh với req.user.id rỗng → ném lỗi, KHÔNG gọi service', async () => {
      const controller = await dungController();
      await expect(
        controller.dieuChinh(
          { employeeId: 'nv1', balanceId: 'q1', soNgay: -1, ghiChu: 'lý do' },
          { user: {} } as any,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(quyPhep.dieuChinhTay).not.toHaveBeenCalled();
    });
  });
});
