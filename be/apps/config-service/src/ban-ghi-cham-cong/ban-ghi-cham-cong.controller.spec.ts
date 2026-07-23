import { BadRequestException } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { AdminGuard, JwtGuard } from '@app/auth';
import { BanGhiChamCong_Controller } from './ban-ghi-cham-cong.controller';

/**
 * Controller này là toàn bộ mặt tiền của chấm công thực tế nên có ba thứ
 * phải khoá bằng test, vì hỏng cả ba đều trôi qua CI hoàn toàn im lặng:
 *
 * 1. Hàng rào phân quyền: gỡ `AdminGuard` khỏi `findAll` là mọi nhân viên
 *    đọc được bản ghi chấm công của cả công ty; gỡ khỏi `hrNhap` là ai cũng
 *    tự chèn được công cho người khác.
 * 2. Nguồn IP: đọc thẳng `X-Forwarded-For` cho phép nhân viên ngồi nhà khai
 *    IP văn phòng để qua mặt đối chiếu địa điểm wifi.
 * 3. Thứ tự route: `@Get()` đứng trước `@Get('hom-nay')` thì "hom-nay" bị
 *    nuốt thành query rỗng của route tra cứu.
 */

const guardsOf = (fn: any): any[] =>
  Reflect.getMetadata('__guards__', fn) ?? [];

const proto = BanGhiChamCong_Controller.prototype as any;

describe('BanGhiChamCong_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(BanGhiChamCong_Controller)).toContain(JwtGuard);
  });

  it.each([['findAll'], ['hrNhap']])(
    'route %s là thao tác quản trị nên phải có AdminGuard',
    (ten) => {
      expect(guardsOf(proto[ten])).toContain(AdminGuard);
    },
  );

  it.each([['checkIn'], ['checkOut'], ['homNay'], ['cuaToi']])(
    'route %s là tự phục vụ nên KHÔNG gắn AdminGuard',
    (ten) => {
      expect(guardsOf(proto[ten])).not.toContain(AdminGuard);
    },
  );
});

describe('BanGhiChamCong_Controller — thứ tự route', () => {
  it('hom-nay khai báo TRƯỚC route tra cứu @Get()', () => {
    const ten = Object.getOwnPropertyNames(proto);
    expect(ten.indexOf('homNay')).toBeGreaterThan(-1);
    expect(ten.indexOf('homNay')).toBeLessThan(ten.indexOf('findAll'));
  });

  it('đường dẫn của hai route đúng như thiết kế', () => {
    expect(Reflect.getMetadata(PATH_METADATA, proto.homNay)).toBe('hom-nay');
    expect(Reflect.getMetadata(PATH_METADATA, proto.findAll)).toBe('/');
  });
});

describe('BanGhiChamCong_Controller — nguồn dữ liệu vào', () => {
  let controller: BanGhiChamCong_Controller;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      checkIn: jest.fn().mockResolvedValue({ _id: 'r1' }),
      checkOut: jest.fn().mockResolvedValue({ _id: 'r2' }),
      homNay: jest.fn().mockResolvedValue({ ngay: '2026-07-22' }),
      findAll: jest.fn().mockResolvedValue([]),
      hrNhap: jest.fn().mockResolvedValue({ _id: 'r3' }),
    };
    controller = new BanGhiChamCong_Controller(mockService);
  });

  /** Request giả lập: client cố tình bịa X-Forwarded-For là IP văn phòng. */
  const reqGiaMao = (over: any = {}) => ({
    user: { id: 'user-1', email: 'hai@cty.vn' },
    ip: '113.161.20.5',
    headers: {
      'user-agent': 'Chrome/1.0',
      'x-forwarded-for': '10.0.0.99',
    },
    socket: { remoteAddress: '113.161.20.5' },
    ...over,
  });

  it.each([
    ['checkIn', 'checkIn'],
    ['checkOut', 'checkOut'],
  ])('%s KHÔNG lấy IP từ header X-Forwarded-For do client gửi', async (ten) => {
    const req = reqGiaMao();
    await (controller as any)[ten]({ deviceId: 'd1', phuongThuc: 'wifi' }, req);

    const [, , ip, ua] = mockService[ten].mock.calls[0];
    expect(ip).toBe('113.161.20.5'); // req.ip, không phải 10.0.0.99
    expect(ip).not.toBe('10.0.0.99');
    expect(ua).toBe('Chrome/1.0');
  });

  it('dùng socket.remoteAddress khi req.ip không có', async () => {
    const req = reqGiaMao({ ip: undefined });
    await controller.checkIn({ deviceId: 'd1', phuongThuc: 'qr' } as any, req);
    expect(mockService.checkIn.mock.calls[0][2]).toBe('113.161.20.5');
  });

  it('employeeId luôn suy từ req.user, không đọc từ body', async () => {
    const req = reqGiaMao();
    await controller.checkIn(
      { deviceId: 'd1', phuongThuc: 'qr', employeeId: 'emp-nguoi-khac' } as any,
      req,
    );
    expect(mockService.checkIn.mock.calls[0][0]).toBe(req.user);
  });

  it('hrNhap ghi vết audit bằng email người thực hiện', async () => {
    await controller.hrNhap({ employeeId: 'emp-9' } as any, reqGiaMao());
    expect(mockService.hrNhap.mock.calls[0][1]).toBe('hai@cty.vn');
  });

  it('hrNhap lùi về id khi token không có email', async () => {
    await controller.hrNhap(
      { employeeId: 'emp-9' } as any,
      reqGiaMao({ user: { id: 'user-1', email: '  ' } }),
    );
    expect(mockService.hrNhap.mock.calls[0][1]).toBe('user-1');
  });

  it('hrNhap từ chối khi không xác định được người thực hiện', async () => {
    await expect(
      controller.hrNhap(
        { employeeId: 'emp-9' } as any,
        reqGiaMao({ user: {} }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockService.hrNhap).not.toHaveBeenCalled();
  });
});

describe('BanGhiChamCong_Controller — cua-toi', () => {
  /**
   * `@Get()` đứng trước `@Get('cua-toi')` thì "cua-toi" bị nuốt thành query
   * rỗng của route tra cứu toàn tenant — và route đó có AdminGuard, nên nhân
   * viên thường sẽ nhận 403 thay vì lịch tuần của mình.
   */
  it('route cua-toi khai trước route tra cứu không tham số', () => {
    const duongDan = (ten: string) =>
      Reflect.getMetadata(PATH_METADATA, proto[ten]);
    const thuTu = Object.getOwnPropertyNames(proto);

    expect(duongDan('cuaToi')).toBe('cua-toi');
    expect(thuTu.indexOf('cuaToi')).toBeLessThan(thuTu.indexOf('findAll'));
  });

  /**
   * Ranh giới dữ liệu: employeeId phải suy từ token trong service. Controller
   * chuyển đúng ba thứ — req.user, tuNgay, denNgay — và KHÔNG được chuyển
   * employeeId dù client có gửi kèm query.
   */
  it('không chuyển employeeId từ query xuống service', async () => {
    const service: any = { cuaToi: jest.fn().mockResolvedValue([]) };

    await proto.cuaToi.call(
      { banGhi_Service: service },
      { tuNgay: '2026-07-21', denNgay: '2026-07-27', employeeId: 'emp-khac' },
      { user: { id: 'sso-1' } },
    );

    expect(service.cuaToi).toHaveBeenCalledWith(
      { id: 'sso-1' },
      '2026-07-21',
      '2026-07-27',
    );
  });
});
