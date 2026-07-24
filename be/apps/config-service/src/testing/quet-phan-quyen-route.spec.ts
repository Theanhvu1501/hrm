import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PermissionGuard, Permissions } from '@app/auth';
import { quetPhanQuyenRoute } from './quet-phan-quyen-route';

/**
 * Hàm quét là hàng rào của các hàng rào: mọi `*.controller.spec.ts` trong
 * config-service đều kết luận "không route nào bị bỏ sót" bằng đúng một dòng
 * `expect(quetPhanQuyenRoute(X)).toEqual([])`. Nó hỏng thì tất cả những dòng
 * đó xanh vô nghĩa, nên chính nó phải có test riêng — với controller GIẢ LẬP
 * mang sẵn từng loại lỗi cần bắt.
 */

@Controller('gia-lap-du')
class ControllerDayDu {
  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tu:xem')
  findAll() {}

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tu:them')
  create() {}
}

@Controller('gia-lap-thieu-guard')
class ControllerThieuGuard {
  @Get()
  @Permissions('/cham-cong/don-tu:xem')
  findAll() {}
}

@Controller('gia-lap-thieu-quyen')
class ControllerThieuQuyen {
  // Đúng cái bẫy im lặng: có guard, không có decorator →
  // `PermissionGuard.canActivate()` trả `true`, route mở toang.
  @Get()
  @UseGuards(PermissionGuard)
  findAll() {}
}

@Controller('gia-lap-go-sai')
class ControllerGoSai {
  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tuu:sua')
  findAll() {}
}

@Controller('gia-lap-sao')
class ControllerQuyenSao {
  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('*')
  findAll() {}
}

@Controller('gia-lap-tu-phuc-vu')
class ControllerTuPhucVu {
  @Get('cua-toi')
  cuaToi() {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tu:xem')
  findAll() {}
}

@Controller('gia-lap-tu-phuc-vu-doi-quyen')
class ControllerTuPhucVuDoiQuyen {
  @Get('cua-toi')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tu:xem')
  cuaToi() {}
}

describe('quetPhanQuyenRoute', () => {
  it('controller đủ guard + quyền hợp lệ: không vi phạm', () => {
    expect(quetPhanQuyenRoute(ControllerDayDu)).toEqual([]);
  });

  it('bắt route thiếu @UseGuards(PermissionGuard)', () => {
    const viPham = quetPhanQuyenRoute(ControllerThieuGuard);

    expect(viPham).toHaveLength(1);
    expect(viPham[0].route).toBe('findAll');
    expect(viPham[0].lyDo).toContain('PermissionGuard');
  });

  it('bắt route có guard nhưng thiếu @Permissions (route mở toang im lặng)', () => {
    const viPham = quetPhanQuyenRoute(ControllerThieuQuyen);

    expect(viPham).toHaveLength(1);
    expect(viPham[0].lyDo).toContain('mở toang');
  });

  /**
   * Trước Task 4c, chuỗi gõ sai qua được cả hai assert cũ (có guard, mảng
   * không rỗng). Vì không ai được cấp `'/cham-cong/don-tuu:sua'`, route 403
   * với tất cả mọi người — hỏng im lặng theo chiều không ai đi báo bảo mật.
   */
  it("bắt chuỗi quyền gõ sai ('don-tuu') dù có đủ guard và mảng không rỗng", () => {
    const viPham = quetPhanQuyenRoute(ControllerGoSai);

    expect(viPham).toHaveLength(1);
    expect(viPham[0].route).toBe('findAll');
    expect(viPham[0].lyDo).toContain('/cham-cong/don-tuu:sua');
  });

  /**
   * `'*'` là ký hiệu "toàn quyền" mà `PermissionGuard` hiểu ở phía NGƯỜI DÙNG
   * (`AuthzLoaderService` trả `permissions: ['*']` cho super admin) — nó không
   * bao giờ là quyền BẮT BUỘC hợp lệ của một route. Gắn nhầm vào `@Permissions`
   * là biến route thành "chỉ super admin", một cách im lặng.
   */
  it("bắt @Permissions('*') — không phải quyền hợp lệ của route", () => {
    expect(quetPhanQuyenRoute(ControllerQuyenSao)).toHaveLength(1);
  });

  it('bỏ qua route tự phục vụ cua-toi (không đòi guard lẫn quyền)', () => {
    expect(quetPhanQuyenRoute(ControllerTuPhucVu)).toEqual([]);
  });

  it('nhưng bắt route tự phục vụ lại đi đòi quyền', () => {
    const viPham = quetPhanQuyenRoute(ControllerTuPhucVuDoiQuyen);

    expect(viPham).toHaveLength(1);
    expect(viPham[0].lyDo).toContain('tự phục vụ');
  });
});
