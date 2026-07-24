import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AdminGuard, JwtGuard } from '@app/auth';
import { DonChamCong_Controller } from './don-cham-cong.controller';

/**
 * Lỗ hổng đang được vá (Task 4): `@UseGuards(JwtGuard)` ở cấp controller,
 * KHÔNG route ghi nào có `AdminGuard`, và `create()` đọc `employeeId` thẳng
 * từ body — bất kỳ tài khoản đăng nhập nào cũng tạo/sửa/xoá đơn của người
 * khác, hoặc tự duyệt đơn của chính mình. Ba thứ dưới đây phải khoá bằng
 * test vì hỏng một trong ba đều trôi qua CI hoàn toàn im lặng:
 *
 * 1. Hàng rào phân quyền: route quản trị thiếu `AdminGuard`.
 * 2. Thứ tự route: `cua-toi` bị `:id` nuốt mất nếu khai sau.
 * 3. Nguồn employeeId: route tự phục vụ đọc employeeId từ body/query thay
 *    vì suy từ token.
 */

const guardsOf = (fn: any): any[] =>
  Reflect.getMetadata('__guards__', fn) ?? [];

const httpMethodOf = (fn: any): RequestMethod =>
  Reflect.getMetadata(METHOD_METADATA, fn);

const pathOf = (fn: any): string => Reflect.getMetadata(PATH_METADATA, fn) ?? '';

const proto = DonChamCong_Controller.prototype as any;

const VERB_GHI = [
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
];

describe('DonChamCong_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(DonChamCong_Controller)).toContain(JwtGuard);
  });

  it.each([
    ['findAll'],
    ['findOne'],
    ['create'],
    ['update'],
    ['remove'],
    ['updateStatus'],
  ])('route %s là thao tác quản trị nên phải có AdminGuard', (ten) => {
    expect(guardsOf(proto[ten])).toContain(AdminGuard);
  });

  it.each([['cuaToi'], ['taoChoChinhMinh'], ['huyCuaToi']])(
    'route %s là tự phục vụ nên KHÔNG gắn AdminGuard',
    (ten) => {
      expect(guardsOf(proto[ten])).not.toContain(AdminGuard);
    },
  );

  // Tiền lệ commit 05cc743 (ca-lam-viec/dia-diem-cham-cong/ngay-le/nhan-vien):
  // hai it.each phía trên liệt kê tay tên method, nên route ghi thêm SAU NÀY
  // (ai đó thêm @Patch mới mà quên AdminGuard) lọt lưới hoàn toàn — CI vẫn
  // xanh vì test chỉ biết hỏi về 9 tên method đã có sẵn. Assert này quét
  // TOÀN BỘ method có HTTP verb ghi (POST/PUT/PATCH/DELETE) bằng metadata,
  // không quan tâm tên — nên route ghi thêm sau này bắt buộc phải tự chứng
  // minh nó an toàn (AdminGuard, hoặc nằm dưới nhóm tự phục vụ cua-toi) thì
  // mới qua được, thay vì mặc định lọt qua vì test không biết tới nó.
  it('mọi route ghi đều có AdminGuard hoặc là route tự phục vụ dưới cua-toi, kể cả route thêm sau này', () => {
    const khongDatDieuKien = Object.getOwnPropertyNames(proto)
      .filter((ten) => VERB_GHI.includes(httpMethodOf(proto[ten])))
      .filter((ten) => {
        const coAdminGuard = guardsOf(proto[ten]).includes(AdminGuard);
        const laTuPhucVu = pathOf(proto[ten]).startsWith('cua-toi');
        return !coAdminGuard && !laTuPhucVu;
      });

    expect(khongDatDieuKien).toEqual([]);
  });
});

describe('DonChamCong_Controller — thứ tự route', () => {
  it('ba route cua-toi khai TRƯỚC mọi route dùng :id', () => {
    const ten = Object.getOwnPropertyNames(proto);
    const idxTuPhucVu = ['cuaToi', 'taoChoChinhMinh', 'huyCuaToi'].map((t) =>
      ten.indexOf(t),
    );
    const idxDungId = ['findOne', 'update', 'remove', 'updateStatus'].map(
      (t) => ten.indexOf(t),
    );

    for (const idx of [...idxTuPhucVu, ...idxDungId]) {
      expect(idx).toBeGreaterThan(-1);
    }

    const maxTuPhucVu = Math.max(...idxTuPhucVu);
    const minDungId = Math.min(...idxDungId);
    expect(maxTuPhucVu).toBeLessThan(minDungId);
  });

  it('đường dẫn của ba route cua-toi đúng như thiết kế', () => {
    expect(Reflect.getMetadata(PATH_METADATA, proto.cuaToi)).toBe('cua-toi');
    expect(Reflect.getMetadata(PATH_METADATA, proto.taoChoChinhMinh)).toBe(
      'cua-toi',
    );
    expect(Reflect.getMetadata(PATH_METADATA, proto.huyCuaToi)).toBe(
      'cua-toi/:id',
    );
  });
});

describe('DonChamCong_Controller — nguồn employeeId (tự phục vụ)', () => {
  let controller: DonChamCong_Controller;
  let mockService: any;
  let mockNhanVienService: any;

  const EMP = { _id: 'emp-goi-thuc-207' };
  const req = { user: { id: 'sso-nguoi-goi' } };

  beforeEach(() => {
    mockService = {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ _id: 'don-1' }),
      huyDonCuaToi: jest.fn().mockResolvedValue(undefined),
      updateStatus: jest.fn().mockResolvedValue({ _id: 'don-1' }),
    };
    mockNhanVienService = {
      resolveEmployeeFromUser: jest.fn().mockResolvedValue(EMP),
    };
    controller = new DonChamCong_Controller(mockService, mockNhanVienService);
  });

  it('POST /cua-toi: employeeId gửi kèm body bị bỏ qua, dùng employeeId suy từ token', async () => {
    await controller.taoChoChinhMinh(
      {
        employeeId: 'emp-khac',
        loaiDon: 'giai_trinh',
        ngay: '2026-07-23',
      } as any,
      req,
    );

    expect(mockNhanVienService.resolveEmployeeFromUser).toHaveBeenCalledWith(
      req.user,
    );
    const dtoGuiXuongService = mockService.create.mock.calls[0][0];
    expect(dtoGuiXuongService.employeeId).toBe(String(EMP._id));
    expect(dtoGuiXuongService.employeeId).not.toBe('emp-khac');
  });

  it('GET /cua-toi: employeeId gửi kèm query bị bỏ qua, chỉ truy vấn đơn của người gọi', async () => {
    await controller.cuaToi(
      { employeeId: 'emp-khac', loaiDon: 'nghi_phep' } as any,
      req,
    );

    const filterGuiXuongService = mockService.findAll.mock.calls[0][0];
    expect(filterGuiXuongService).toEqual(
      expect.objectContaining({
        employeeId: String(EMP._id),
        loaiDon: 'nghi_phep',
      }),
    );
    expect(filterGuiXuongService.employeeId).not.toBe('emp-khac');
  });

  it('DELETE /cua-toi/:id: employeeId của người gọi (suy từ token) được truyền xuống service, không phải id đơn', async () => {
    await controller.huyCuaToi('don-1', req);

    expect(mockService.huyDonCuaToi).toHaveBeenCalledWith(
      'don-1',
      String(EMP._id),
    );
  });

  it('PATCH :id/trang-thai: người thực hiện (req.user) được truyền xuống service để chặn tự duyệt', async () => {
    await (controller as any).updateStatus(
      'don-1',
      { trangThai: 'da_duyet', nguoiDuyet: 'Manager A' },
      req,
    );

    expect(mockService.updateStatus).toHaveBeenCalledWith(
      'don-1',
      'da_duyet',
      'Manager A',
      req.user,
    );
  });
});
