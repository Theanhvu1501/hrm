import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PermissionGuard, PERMISSIONS_KEY } from '@app/auth';

/**
 * Bộ đọc metadata dùng chung cho các spec phân quyền của config-service.
 *
 * Vì sao phải quét metadata chứ không liệt kê tay tên method: tiền lệ
 * `05cc743` viết `it.each([['create'], ['update'], ...])`, nên route ghi thêm
 * SAU NÀY lọt lưới hoàn toàn — CI vẫn xanh vì test chỉ biết hỏi về những tên
 * method đã có sẵn.
 *
 * Và vì sao chuyện đó nguy hiểm gấp đôi với `PermissionGuard`:
 * `PermissionGuard.canActivate()` trả `true` khi route KHÔNG khai
 * `@Permissions()`. Gắn guard mà quên decorator = route mở toang, không có
 * dấu hiệu gì ở runtime lẫn lúc build. Hàm quét dưới đây là thứ DUY NHẤT
 * chặn được chuyện đó.
 */

export const guardsOf = (fn: any): any[] =>
  Reflect.getMetadata('__guards__', fn) ?? [];

export const httpMethodOf = (fn: any): RequestMethod | undefined =>
  Reflect.getMetadata(METHOD_METADATA, fn);

export const pathOf = (fn: any): string =>
  Reflect.getMetadata(PATH_METADATA, fn) ?? '';

export const permissionsOf = (fn: any): string[] | undefined =>
  Reflect.getMetadata(PERMISSIONS_KEY, fn);

/**
 * Tiền tố đường dẫn của các route TỰ PHỤC VỤ mặc định: nhân viên thao tác
 * trên dữ liệu của CHÍNH MÌNH. Những route này cố ý KHÔNG nhận quyền theo vai
 * trò — bắt HR gán quyền cho từng người sẽ khiến người mới không xem/chấm
 * được vào đúng ngày đầu tiên. Phạm vi được khoá bằng `employeeId` suy từ
 * token trong controller/service, không bằng `@Permissions`.
 *
 * Xem chú thích cuối `libs/core/src/permissions/all-permissions.ts`:
 * `/cham-cong/cua-toi` CỐ Ý không có trong catalog quyền.
 */
const TU_PHUC_VU_MAC_DINH = ['cua-toi', 'me'];

/**
 * So khớp trọn đoạn đường dẫn chứ không `startsWith` thuần: `startsWith('me')`
 * sẽ nuốt nhầm một route tương lai tên `members`, biến route quản trị thành
 * "tự phục vụ" trong mắt test và tự tay mở toang nó.
 */
const laTuPhucVu = (duongDan: string, tuPhucVuThem: string[]): boolean =>
  [...TU_PHUC_VU_MAC_DINH, ...tuPhucVuThem].some(
    (tienTo) => duongDan === tienTo || duongDan.startsWith(`${tienTo}/`),
  );

export interface ViPhamPhanQuyen {
  route: string;
  lyDo: string;
}

/**
 * Quét MỌI method có `METHOD_METADATA` (tức mọi route HTTP, kể cả route thêm
 * sau này) của một controller và trả về danh sách vi phạm. Luật:
 *
 *  - route tự phục vụ  -> phải KHÔNG có `@Permissions()`;
 *  - còn lại           -> phải có `PermissionGuard` trong `__guards__` VÀ
 *                         `@Permissions()` với mảng không rỗng.
 *
 * @param tuPhucVuThem các đường dẫn tự phục vụ riêng của controller, ngoài
 *   `cua-toi`/`me` (vd `check-in` của bản ghi chấm công). Cố ý bắt khai tường
 *   minh: mỗi lần nới danh sách này là một lần bỏ hàng rào quyền, phải nhìn
 *   thấy trong diff.
 */
export function quetPhanQuyenRoute(
  controllerClass: any,
  tuPhucVuThem: string[] = [],
): ViPhamPhanQuyen[] {
  const proto = controllerClass.prototype;

  return Object.getOwnPropertyNames(proto)
    .filter((ten) => httpMethodOf(proto[ten]) !== undefined)
    .flatMap<ViPhamPhanQuyen>((ten) => {
      const quyen = permissionsOf(proto[ten]);

      if (laTuPhucVu(pathOf(proto[ten]), tuPhucVuThem)) {
        return quyen && quyen.length > 0
          ? [
              {
                route: ten,
                lyDo: `route tự phục vụ nhưng lại đòi quyền: ${quyen.join(', ')}`,
              },
            ]
          : [];
      }

      if (!guardsOf(proto[ten]).includes(PermissionGuard)) {
        return [{ route: ten, lyDo: 'thiếu @UseGuards(PermissionGuard)' }];
      }

      if (!quyen || quyen.length === 0) {
        return [
          {
            route: ten,
            lyDo:
              'thiếu @Permissions() — PermissionGuard cho qua khi route không ' +
              'khai quyền, nên route đang mở toang',
          },
        ];
      }

      return [];
    });
}
