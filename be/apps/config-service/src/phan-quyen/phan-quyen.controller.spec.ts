import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { PhanQuyen_Controller } from './phan-quyen.controller';
import { UpsertPermissionsDto } from './upsert-permissions.dto';
import { CreatePhanQuyenDto } from './create-phan-quyen.dto';
import { UpdatePhanQuyenDto } from './update-phan-quyen.dto';

/**
 * Đây là controller đứng giữa mọi hàng rào khác: từ commit 67979dd,
 * `phan_quyen.permissions` là nguồn thẩm quyền thật của các controller chấm
 * công/nhân sự. Route ghi ở đây mà không có hàng rào thì mọi
 * `@Permissions(...)` gắn ở nơi khác đều vô nghĩa — nhân viên thường chỉ cần
 * `PUT /config/phan-quyen/:id` với `{"permissions":["*"]}` là tự cấp toàn
 * quyền (`PermissionGuard` hiểu `'*'` là toàn quyền), và ≤30s sau (TTL cache
 * `AuthzLoaderService`) là dùng được.
 *
 * Test bám metadata `__guards__` / `PERMISSIONS_KEY` vì đó chính là thứ Nest
 * đọc lúc chạy — gỡ `@Permissions` hay `@UseGuards(PermissionGuard)` khỏi bất
 * kỳ route nào là đỏ ngay.
 */

const proto = PhanQuyen_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/cau-hinh/phan-quyen:xem'],
  ['getPermissions', RequestMethod.GET, '/cau-hinh/phan-quyen:xem'],
  ['findByVaiTro', RequestMethod.GET, '/cau-hinh/phan-quyen:xem'],
  ['findOne', RequestMethod.GET, '/cau-hinh/phan-quyen:xem'],
  // Ghi đè cả bộ quyền của một vai trò là SỬA vai trò đó, không phải tạo mới.
  ['upsertPermissions', RequestMethod.PUT, '/cau-hinh/phan-quyen:sua'],
  ['create', RequestMethod.POST, '/cau-hinh/phan-quyen:them'],
  ['update', RequestMethod.PUT, '/cau-hinh/phan-quyen:sua'],
  ['delete', RequestMethod.DELETE, '/cau-hinh/phan-quyen:xoa'],
];

describe('PhanQuyen_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(PhanQuyen_Controller)).toContain(JwtGuard);
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
    expect(quetPhanQuyenRoute(PhanQuyen_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });

  /**
   * Không route nào của controller này được là "tự phục vụ": không có dữ liệu
   * cá nhân nào trong `phan_quyen`, nên một route ở đây mà không đòi quyền
   * chỉ có thể là do quên. Khoá lại tường minh để lần sau ai đó thêm
   * `cua-toi`/`me` vào đây thì phải giải thích trong diff, thay vì được hàm
   * quét miễn trừ im lặng.
   */
  it('không route nào được miễn trừ theo diện tự phục vụ', () => {
    expect(quetPhanQuyenRoute(PhanQuyen_Controller, [])).toEqual([]);
    for (const [ten] of BANG_QUYEN) {
      expect(permissionsOf(proto[ten])).toBeDefined();
    }
  });
});

/**
 * `update-phan-quyen.dto.spec.ts` khoá các ràng buộc BÊN TRONG DTO, nhưng nó
 * hoàn toàn xanh kể cả khi route quay về `@Body() updateDto: any` — DTO vẫn
 * đúng, chỉ là không route nào dùng nó nữa. `ValidationPipe` chỉ chạy khi
 * tham số có metatype thật; `any` (và inline type) đều biên dịch ra `Object`,
 * và pipe bỏ qua `Object`. Nên phải khoá thêm ở đây: metatype mà Nest đọc
 * lúc chạy đúng là class DTO.
 */
describe('PhanQuyen_Controller — body phải có metatype thật cho ValidationPipe', () => {
  const kieuThamSo = (ten: string): any[] =>
    Reflect.getMetadata('design:paramtypes', proto, ten) ?? [];

  const BANG_DTO_BODY: Array<[string, any]> = [
    ['upsertPermissions', UpsertPermissionsDto],
    ['create', CreatePhanQuyenDto],
    ['update', UpdatePhanQuyenDto],
  ];

  it.each(BANG_DTO_BODY)('route %s nhận body kiểu DTO thật', (ten, Dto) => {
    expect(kieuThamSo(ten)).toContain(Dto);
  });

  it.each(BANG_DTO_BODY)(
    'route %s không còn tham số nào kiểu Object (dấu vết của `any`)',
    (ten) => {
      expect(kieuThamSo(ten)).not.toContain(Object);
    },
  );
});
