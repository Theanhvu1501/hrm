import { PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { DonChamCong_Controller } from './don-cham-cong.controller';

/**
 * Lỗ hổng đã được vá (Task 4): `@UseGuards(JwtGuard)` ở cấp controller, KHÔNG
 * route ghi nào có hàng rào phân quyền, và `create()` đọc `employeeId` thẳng
 * từ body — bất kỳ tài khoản đăng nhập nào cũng tạo/sửa/xoá đơn của người
 * khác, hoặc tự duyệt đơn của chính mình. Ba thứ dưới đây phải khoá bằng
 * test vì hỏng một trong ba đều trôi qua CI hoàn toàn im lặng:
 *
 * 1. Hàng rào phân quyền: route quản trị thiếu `@Permissions` /
 *    `PermissionGuard`. Hàng rào là `PermissionGuard` chứ KHÔNG phải
 *    `AdminGuard`: `AdminGuard` so `vaiTro` với đúng chuỗi
 *    'ADMIN'/'SUPER_ADMIN', trong khi `vaiTro` là tên vai trò tự do từng
 *    tenant đặt ("Quản trị hệ thống", "Quản lý"...) nên trên production nó
 *    chặn cả HR thật.
 * 2. Thứ tự route: `cua-toi` bị `:id` nuốt mất nếu khai sau.
 * 3. Nguồn employeeId: route tự phục vụ đọc employeeId từ body/query thay
 *    vì suy từ token.
 */

const proto = DonChamCong_Controller.prototype as any;

/** Route quản trị: động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/cham-cong/don-tu:xem'],
  ['findOne', RequestMethod.GET, '/cham-cong/don-tu:xem'],
  ['create', RequestMethod.POST, '/cham-cong/don-tu:them'],
  ['update', RequestMethod.PUT, '/cham-cong/don-tu:sua'],
  // Duyệt/từ chối là SỬA đơn đã có, nên `:sua` chứ không phải `:xoa`.
  ['updateStatus', RequestMethod.PATCH, '/cham-cong/don-tu:sua'],
  ['remove', RequestMethod.DELETE, '/cham-cong/don-tu:xoa'],
];

/** Route tự phục vụ: cố ý KHÔNG nhận quyền theo vai trò. */
const ROUTE_TU_PHUC_VU = ['cuaToi', 'taoChoChinhMinh', 'huyCuaToi'];

describe('DonChamCong_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(DonChamCong_Controller)).toContain(JwtGuard);
  });

  it.each(BANG_QUYEN)(
    'route %s có PermissionGuard và đòi đúng quyền',
    (ten, method, quyen) => {
      expect(httpMethodOf(proto[ten])).toBe(method);
      expect(guardsOf(proto[ten])).toContain(PermissionGuard);
      expect(permissionsOf(proto[ten])).toEqual([quyen]);
    },
  );

  /**
   * Ba route `cua-toi` là đường tự phục vụ của nhân viên: nộp / xem / huỷ đơn
   * của CHÍNH MÌNH. Gắn quyền vào đây là khoá luôn đường nộp đơn của người
   * chưa được HR gán vai trò nào. Phạm vi dữ liệu đã khoá bằng `employeeId`
   * suy từ token (xem describe cuối file).
   */
  it.each(ROUTE_TU_PHUC_VU)('route tự phục vụ %s KHÔNG gắn quyền', (ten) => {
    expect(permissionsOf(proto[ten])).toBeUndefined();
    expect(guardsOf(proto[ten])).not.toContain(PermissionGuard);
  });

  // Tiền lệ commit 05cc743 (ca-lam-viec/dia-diem-cham-cong/ngay-le/nhan-vien):
  // các it.each phía trên liệt kê tay tên method, nên route thêm SAU NÀY (ai
  // đó thêm @Patch mới mà quên quyền) lọt lưới hoàn toàn — CI vẫn xanh vì test
  // chỉ biết hỏi về những tên method đã có sẵn. Assert này quét TOÀN BỘ method
  // có METHOD_METADATA bằng metadata, không quan tâm tên. Quan trọng gấp đôi
  // với PermissionGuard: `canActivate()` trả true khi route không khai
  // @Permissions, nên gắn guard mà quên decorator = route mở toang, không có
  // dấu hiệu gì.
  it('mọi route đều có PermissionGuard + @Permissions không rỗng, hoặc là route tự phục vụ dưới cua-toi', () => {
    expect(quetPhanQuyenRoute(DonChamCong_Controller)).toEqual([]);
  });

  it('bảng quyền + danh sách tự phục vụ phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(
      [...BANG_QUYEN.map(([t]) => t), ...ROUTE_TU_PHUC_VU].sort(),
    );
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
