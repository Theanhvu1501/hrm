import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { BangCong_Controller } from './bang-cong.controller';

/**
 * Bảng công là bảng tính lương — đọc được nó là biết số công/số giờ OT của
 * cả công ty, ghi được nó là đổi được số tiền người khác nhận. Trước bản vá,
 * controller chỉ có `JwtGuard`.
 *
 * Test bám metadata `__guards__` / `PERMISSIONS_KEY` vì đó chính là thứ Nest
 * đọc lúc chạy — gỡ `@Permissions` hay `@UseGuards(PermissionGuard)` khỏi bất
 * kỳ route nào là đỏ ngay.
 */

const proto = BangCong_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['kyHieu', RequestMethod.GET, '/cham-cong/bang-cong:xem'],
  ['findAll', RequestMethod.GET, '/cham-cong/bang-cong:xem'],
  ['findOne', RequestMethod.GET, '/cham-cong/bang-cong:xem'],
  // Bảng giờ làm thực tế: xuất giờ ra/vào của toàn bộ nhân sự → quyền `:xuat`.
  ['bangGioLam', RequestMethod.GET, '/cham-cong/bang-cong:xuat'],
  // Gửi bảng công cho nhân viên xác nhận = SỬA trạng thái bảng công của cả
  // tháng (yêu cầu d19).
  ['guiXacNhan', RequestMethod.POST, '/cham-cong/bang-cong:sua'],
  ['generate', RequestMethod.POST, '/cham-cong/bang-cong:them'],
  ['update', RequestMethod.PUT, '/cham-cong/bang-cong:sua'],
  ['setDay', RequestMethod.PATCH, '/cham-cong/bang-cong:sua'],
  // finalize/moLai là một CẶP khoá-mở khoá (Finding I review) — cả hai đều
  // đòi ':sua', không phải finalize=':them' như trước: một vai trò chỉ có
  // ':sua' phải mở lại được chính tháng mình vừa khoá.
  ['finalize', RequestMethod.POST, '/cham-cong/bang-cong:sua'],
  ['moLai', RequestMethod.POST, '/cham-cong/bang-cong:sua'],
  ['remove', RequestMethod.DELETE, '/cham-cong/bang-cong:xoa'],
];

describe('BangCong_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(BangCong_Controller)).toContain(JwtGuard);
  });

  it.each(BANG_QUYEN)(
    'route %s có PermissionGuard và đòi đúng quyền',
    (ten, method, quyen) => {
      expect(httpMethodOf(proto[ten])).toBe(method);
      expect(guardsOf(proto[ten])).toContain(PermissionGuard);
      expect(permissionsOf(proto[ten])).toEqual([quyen]);
    },
  );

  it('không route nào bị bỏ sót, kể cả route thêm sau này', () => {
    expect(quetPhanQuyenRoute(BangCong_Controller)).toEqual([]);
  });

  /** Route tự phục vụ (nhánh `cua-toi`) cố ý KHÔNG nằm trong bảng quyền. */
  const ROUTE_TU_PHUC_VU = ['cuaToi', 'phanHoiXacNhan'];

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(
      [...BANG_QUYEN.map(([t]) => t), ...ROUTE_TU_PHUC_VU].sort(),
    );
  });

  /**
   * Hai route TỰ PHỤC VỤ (yêu cầu d19: nhân viên xác nhận bảng công của chính
   * mình) nằm dưới nhánh `cua-toi` — đúng tiền tố mặc định của
   * `quetPhanQuyenRoute`, nên KHÔNG phải nới danh sách miễn trừ. Mọi route
   * khác vẫn phải có quyền đầy đủ.
   *
   * Phạm vi dữ liệu của hai route đó khoá bằng `employeeId` suy từ token
   * (`BangCong_Service.cuaToi` / `phanHoiXacNhan` so khớp lại lần nữa), không
   * bằng `@Permissions`.
   */
  it('không route nào được miễn trừ ngoài nhánh cua-toi', () => {
    expect(quetPhanQuyenRoute(BangCong_Controller, [])).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// mo-lai — route mới của Task 6 (P3.9): chuyển tiếp đúng `thang` xuống
// service. Route tên cố định phải khai TRƯỚC `:id` trong controller — kiểm
// bằng thứ tự khai báo giống describe "thứ tự route" của don-cham-cong.
// ──────────────────────────────────────────────────────────────────────────
describe('BangCong_Controller — mo-lai', () => {
  let bangCong: any;

  function dungController(): BangCong_Controller {
    bangCong = {
      moLai: jest.fn().mockResolvedValue(2),
    };
    // Đối số thứ hai là NhanVien_Service, chỉ dùng ở hai route tự phục vụ.
    return new BangCong_Controller(bangCong as any, {} as any);
  }

  it('mo-lai gọi service với đúng tháng', async () => {
    const controller = await dungController();
    await controller.moLai({ thang: '2026-08' } as any);
    expect(bangCong.moLai).toHaveBeenCalledWith('2026-08');
  });

  // `mo-lai` là route POST tên cố định — route tên cố định phải khai TRƯỚC
  // bất kỳ route POST nào nhận `:id`, nếu không NestJS khớp nhầm chuỗi
  // "mo-lai" thành tham số đó. Controller này hiện không có route POST nào
  // nhận `:id` (chỉ `generate`/`finalize`/`mo-lai`, không tham số) — khoá lại
  // tường minh để route POST `:id` thêm sau này (nếu có) buộc phải đứng SAU.
  it('không route POST nào khác nhận tham số :id đứng trước mo-lai', () => {
    const ten = Object.getOwnPropertyNames(proto);
    const routePost = ten.filter((t) => httpMethodOf(proto[t]) === RequestMethod.POST);

    // `gui-xac-nhan` là route POST tên cố định (một đoạn) — nằm trước
    // `cua-toi/:id/phan-hoi` đúng nguyên tắc route tên cố định đứng trước.
    expect(routePost).toEqual([
      'guiXacNhan',
      'phanHoiXacNhan',
      'generate',
      'finalize',
      'moLai',
    ]);
  });
});
