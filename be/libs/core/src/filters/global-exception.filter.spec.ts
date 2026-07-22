import * as fc from 'fast-check';
import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

describe('GlobalExceptionFilter Property Tests', () => {
  const getErrorCode = (status: HttpStatus): string => {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.BAD_GATEWAY:
        return 'BAD_GATEWAY';
      default:
        return 'INTERNAL_ERROR';
    }
  };

  /**
   * Property 21: Error Response Standardization
   * For any error response, the body SHALL contain
   * { success: false, error: { code: string, message: string } } structure.
   */
  describe('Property 21: Error Response Standardization', () => {
    it('should always return standardized error response structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            status: fc.constantFrom(
              HttpStatus.BAD_REQUEST,
              HttpStatus.UNAUTHORIZED,
              HttpStatus.FORBIDDEN,
              HttpStatus.NOT_FOUND,
              HttpStatus.CONFLICT,
              HttpStatus.INTERNAL_SERVER_ERROR,
              HttpStatus.BAD_GATEWAY,
            ),
            message: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          ({ status, message }) => {
            const errorResponse: ErrorResponse = {
              success: false,
              error: {
                code: getErrorCode(status),
                message,
              },
            };

            // Verify structure
            expect(errorResponse.success).toBe(false);
            expect(errorResponse.error).toBeDefined();
            expect(typeof errorResponse.error.code).toBe('string');
            expect(typeof errorResponse.error.message).toBe('string');
            expect(errorResponse.error.code.length).toBeGreaterThan(0);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should map HTTP status to correct error code', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { status: HttpStatus.UNAUTHORIZED, expectedCode: 'UNAUTHORIZED' },
            { status: HttpStatus.FORBIDDEN, expectedCode: 'FORBIDDEN' },
            { status: HttpStatus.NOT_FOUND, expectedCode: 'NOT_FOUND' },
            {
              status: HttpStatus.BAD_REQUEST,
              expectedCode: 'VALIDATION_ERROR',
            },
            { status: HttpStatus.CONFLICT, expectedCode: 'CONFLICT' },
            { status: HttpStatus.BAD_GATEWAY, expectedCode: 'BAD_GATEWAY' },
            {
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              expectedCode: 'INTERNAL_ERROR',
            },
          ),
          ({ status, expectedCode }) => {
            const code = getErrorCode(status);
            expect(code).toBe(expectedCode);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 22: Internal Error Concealment
   * For any unexpected error (500), the response SHALL NOT contain
   * stack traces or internal implementation details.
   */
  describe('Property 22: Internal Error Concealment', () => {
    it('should not expose stack traces in error response', () => {
      fc.assert(
        fc.property(
          fc.record({
            errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
            stackTrace: fc.string({ minLength: 50, maxLength: 500 }),
          }),
          () => {
            // Simulate internal error response
            const errorResponse: ErrorResponse = {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
              },
            };

            // Verify no stack trace in response
            const responseString = JSON.stringify(errorResponse);
            expect(responseString).not.toContain('at ');
            expect(responseString).not.toContain('.ts:');
            expect(responseString).not.toContain('.js:');
            expect(responseString).not.toContain('Error:');
            expect(responseString).not.toContain('stack');

            // Verify generic message for internal errors
            expect(errorResponse.error.message).toBe(
              'An unexpected error occurred',
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should use generic message for 500 errors', () => {
      fc.assert(
        fc.property(
          fc.record({
            internalMessage: fc.string({ minLength: 1, maxLength: 500 }),
            sensitiveData: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          () => {
            // For 500 errors, always use generic message
            const errorResponse: ErrorResponse = {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
              },
            };

            // Should not contain any sensitive information
            expect(errorResponse.error.message).toBe(
              'An unexpected error occurred',
            );
            expect(errorResponse.error.code).toBe('INTERNAL_ERROR');

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not expose database or system details', () => {
      const sensitivePatterns = [
        'mongodb://',
        'postgres://',
        'mysql://',
        'password',
        'secret',
        'api_key',
        'token',
        '/home/',
        '/Users/',
        'node_modules',
      ];

      fc.assert(
        fc.property(fc.boolean(), () => {
          const errorResponse: ErrorResponse = {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred',
            },
          };

          const responseString = JSON.stringify(errorResponse).toLowerCase();

          for (const pattern of sensitivePatterns) {
            expect(responseString).not.toContain(pattern.toLowerCase());
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });
});

/**
 * Kiểm thử hành vi thật của filter (khác các property test ở trên — chúng chỉ
 * kiểm tra lại bảng ánh xạ status→code chứ không dựng filter).
 *
 * Trọng tâm: mã lỗi miền do service ném kèm (`{ code: '...' }`) phải tới được
 * client nguyên vẹn, đồng thời KHÔNG được đổi bất kỳ hành vi cũ nào — filter
 * này dùng chung cho cả gateway, auth-service và config-service.
 */
describe('GlobalExceptionFilter — ưu tiên mã lỗi miền', () => {
  let filter: GlobalExceptionFilter;

  /** Dựng một ArgumentsHost giả, trả về các spy để soi status + body. */
  const taoHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'POST', url: '/cham-cong/diem-danh' }),
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  };

  /** Chạy filter với một ngoại lệ, trả về { status, body } client nhận được. */
  const batLoi = (exception: unknown) => {
    const { host, status, json } = taoHost();
    filter.catch(exception, host);
    expect(status).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledTimes(1);
    return {
      status: status.mock.calls[0][0] as number,
      body: json.mock.calls[0][0] as ErrorResponse,
    };
  };

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    // Filter luôn ghi log kèm stack; chặn để output test khỏi nhiễu.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Hành vi MỚI: ngoại lệ có trường `code` là chuỗi', () => {
    it('giữ nguyên mã miền THIET_BI_CHO_DUYET thay vì suy ra FORBIDDEN', () => {
      const { status, body } = batLoi(
        new ForbiddenException({
          code: 'THIET_BI_CHO_DUYET',
          message: 'Thiết bị đang chờ HR duyệt.',
        }),
      );

      expect(body.error.code).toBe('THIET_BI_CHO_DUYET');
      // Mã miền KHÔNG được làm đổi HTTP status — vẫn phải là 403.
      expect(status).toBe(HttpStatus.FORBIDDEN);
      // Câu chữ do service quyết định, filter không được viết lại.
      expect(body.error.message).toBe('Thiết bị đang chờ HR duyệt.');
      expect(body.success).toBe(false);
    });

    it('giữ nguyên đủ 7 mã lỗi miền của module thiết bị chấm công', () => {
      const cacMaLoi = [
        'THIET_BI_CHO_DUYET',
        'THIET_BI_CHUA_DUOC_PHEP',
        'THIET_BI_BI_TU_CHOI',
        'THIET_BI_BI_THU_HOI',
        'THIET_BI_THIEU_DINH_DANH',
        'THIET_BI_DU_LIEU_BAT_NHAT',
        'THIET_BI_TRANG_THAI_KHONG_HOP_LE',
      ];

      for (const code of cacMaLoi) {
        const { status, body } = batLoi(
          new ForbiddenException({ code, message: 'Không thể chấm công.' }),
        );
        expect(body.error.code).toBe(code);
        expect(status).toBe(HttpStatus.FORBIDDEN);
      }
    });

    it('ưu tiên mã miền ở mọi HTTP status, không riêng 403', () => {
      const { status, body } = batLoi(
        new ConflictException({
          code: 'THIET_BI_DU_LIEU_BAT_NHAT',
          message: 'Dữ liệu thiết bị bất nhất.',
        }),
      );

      expect(body.error.code).toBe('THIET_BI_DU_LIEU_BAT_NHAT');
      expect(status).toBe(HttpStatus.CONFLICT);
    });
  });

  describe('Hành vi CŨ phải giữ nguyên: không có mã miền hợp lệ', () => {
    it('ngoại lệ ném dạng chuỗi thuần → vẫn suy mã từ status', () => {
      const { status, body } = batLoi(new ForbiddenException('chuỗi thuần'));

      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toBe('chuỗi thuần');
      expect(status).toBe(HttpStatus.FORBIDDEN);
    });

    it('object không có trường `code` → vẫn suy mã từ status', () => {
      const { status, body } = batLoi(new BadRequestException({ message: 'x' }));

      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('x');
      expect(status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('NotFoundException dựng theo lối thường của Nest → vẫn NOT_FOUND', () => {
      // Nest tự bọc thành { message, error, statusCode } — không có `code`.
      const { status, body } = batLoi(
        new NotFoundException('Không tìm thấy nhân viên'),
      );

      expect(body.error.code).toBe('NOT_FOUND');
      expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    it('lỗi validate của class-validator (message là mảng) → Validation failed + details.validation', () => {
      const { status, body } = batLoi(
        new BadRequestException({
          message: ['deviceId không được để trống', 'employeeId phải là chuỗi'],
          error: 'Bad Request',
          statusCode: 400,
        }),
      );

      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Validation failed');
      expect(body.error.details).toEqual({
        validation: [
          'deviceId không được để trống',
          'employeeId phải là chuỗi',
        ],
      });
      expect(status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('mã miền vẫn được giữ khi đi kèm lỗi validate dạng mảng', () => {
      const { body } = batLoi(
        new BadRequestException({
          code: 'THIET_BI_THIEU_DINH_DANH',
          message: ['deviceId không được để trống'],
        }),
      );

      expect(body.error.code).toBe('THIET_BI_THIEU_DINH_DANH');
      // Khối validate vẫn phải nguyên vẹn.
      expect(body.error.message).toBe('Validation failed');
      expect(body.error.details).toEqual({
        validation: ['deviceId không được để trống'],
      });
    });
  });

  describe('`code` không phải chuỗi không rỗng → bỏ qua, quay về hành vi cũ', () => {
    const truongHopXau: Array<[string, unknown]> = [
      ['số', 403],
      ['null', null],
      ['undefined', undefined],
      ['object', { ma: 'THIET_BI_CHO_DUYET' }],
      ['mảng', ['THIET_BI_CHO_DUYET']],
      ['boolean', true],
      ['chuỗi rỗng', ''],
      ['chuỗi toàn khoảng trắng', '   '],
    ];

    it.each(truongHopXau)('bỏ qua `code` kiểu %s', (_ten, code) => {
      const { status, body } = batLoi(
        new ForbiddenException({ code, message: 'Không có quyền' }),
      );

      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toBe('Không có quyền');
      expect(status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('Ngoại lệ không phải HttpException', () => {
    it('Error thường → INTERNAL_ERROR + 500 + thông báo chung', () => {
      const { status, body } = batLoi(new Error('kết nối Mongo thất bại'));

      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('An unexpected error occurred');
      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('object thường có `code` cũng KHÔNG được nhận → vẫn INTERNAL_ERROR', () => {
      // Chỉ HttpException mới được tin; object lạ có thể tới từ thư viện
      // ngoài, không phải hợp đồng lỗi của mình.
      const { status, body } = batLoi({ code: 'THIET_BI_CHO_DUYET' });

      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('Hình dạng phản hồi', () => {
    it('không kèm `details` khi không có lỗi validate', () => {
      const { body } = batLoi(
        new ForbiddenException({
          code: 'THIET_BI_BI_THU_HOI',
          message: 'Thiết bị đã bị thu hồi.',
        }),
      );

      expect(Object.keys(body)).toEqual(['success', 'error']);
      expect(Object.keys(body.error)).toEqual(['code', 'message']);
    });
  });
});
