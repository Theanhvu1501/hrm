import { describe, it, expect } from 'vitest';
import type { AxiosError } from 'axios';
import { ServiceBase, resolveBackendMessage } from './service-base';
import { ApiErrorType } from '@/config/api';

/**
 * `handleError` là private nên gọi qua ép kiểu `any` — cách duy nhất để bài
 * test đi qua đúng đường thật (không chỉ đơn vị `resolveBackendMessage`).
 *
 * Bối cảnh: GlobalExceptionFilter (be/libs/core/src/filters/
 * global-exception.filter.ts) bọc MỌI lỗi backend thành
 * `{ success:false, error:{ code, message }, requestId }`. Trước bản vá này,
 * `handleError` chỉ đọc `data.message` (không tồn tại ở hình dạng trên) nên
 * `ApiError.message` rơi về chuỗi mặc định của axios kiểu
 * "Request failed with status code 409" thay vì câu tiếng Việt cụ thể.
 */
function callHandleError(error: Partial<AxiosError>) {
  const service = new ServiceBase({ endpoint: '/x' }) as unknown as {
    handleError: (e: AxiosError) => { message: string; type: ApiErrorType; statusCode?: number };
  };
  return service.handleError(error as AxiosError);
}

function axiosLoi(status: number, data: unknown, axiosMessage = `Request failed with status code ${status}`) {
  return {
    message: axiosMessage,
    response: { status, data, statusText: '', headers: {}, config: {} as never },
  } as Partial<AxiosError>;
}

describe('resolveBackendMessage', () => {
  it('ưu tiên data.error.message (hình dạng thật của GlobalExceptionFilter)', () => {
    expect(
      resolveBackendMessage({
        success: false,
        error: { code: 'CONFLICT', message: 'Bạn đã check-in rồi' },
      }),
    ).toBe('Bạn đã check-in rồi');
  });

  it('dự phòng data.message khi không có data.error', () => {
    expect(resolveBackendMessage({ message: 'Không tìm thấy tài nguyên' })).toBe(
      'Không tìm thấy tài nguyên',
    );
  });

  it('data.error.message ưu tiên hơn data.message khi cả hai cùng có', () => {
    expect(
      resolveBackendMessage({
        message: 'câu cũ dạng phẳng',
        error: { message: 'câu mới từ GlobalExceptionFilter' },
      }),
    ).toBe('câu mới từ GlobalExceptionFilter');
  });

  it('message dạng mảng (lỗi validate thô) được nối thành một câu', () => {
    expect(resolveBackendMessage({ message: ['Tên là bắt buộc', 'Email không hợp lệ'] })).toBe(
      'Tên là bắt buộc; Email không hợp lệ',
    );
  });

  it('mảng rỗng hoặc không có gì để đọc → undefined, không ném', () => {
    expect(resolveBackendMessage({ message: [] })).toBeUndefined();
    expect(resolveBackendMessage({})).toBeUndefined();
    expect(resolveBackendMessage(undefined)).toBeUndefined();
    expect(resolveBackendMessage('không phải object')).toBeUndefined();
  });
});

describe('ServiceBase handleError', () => {
  it('409 dạng thật của backend → ApiError.message là câu tiếng Việt, không phải câu chung của axios', () => {
    const err = axiosLoi(409, {
      success: false,
      error: { code: 'CONFLICT', message: 'Đến ngày không được nhỏ hơn từ ngày' },
    });
    const apiError = callHandleError(err);
    expect(apiError.message).toBe('Đến ngày không được nhỏ hơn từ ngày');
    expect(apiError.statusCode).toBe(409);
  });

  it('403 dạng thật (mã lỗi miền thiết bị) → vẫn đọc đúng message, không đổi type suy từ status', () => {
    const err = axiosLoi(403, {
      success: false,
      error: {
        code: 'THIET_BI_CHO_DUYET',
        message: 'Thiết bị của bạn đang chờ HR duyệt.',
      },
    });
    const apiError = callHandleError(err);
    expect(apiError.message).toBe('Thiết bị của bạn đang chờ HR duyệt.');
    expect(apiError.type).toBe(ApiErrorType.FORBIDDEN);
  });

  it('vẫn đọc được dạng phẳng cũ { message } — đường dự phòng không bị bỏ', () => {
    const err = axiosLoi(422, { message: 'Dữ liệu không hợp lệ' });
    const apiError = callHandleError(err);
    expect(apiError.message).toBe('Dữ liệu không hợp lệ');
    expect(apiError.type).toBe(ApiErrorType.VALIDATION_ERROR);
  });

  it('response.data rỗng → rơi về error.message của axios, không ném lỗi', () => {
    const err = axiosLoi(500, {});
    const apiError = callHandleError(err);
    expect(apiError.message).toBe('Request failed with status code 500');
    expect(apiError.type).toBe(ApiErrorType.SERVER_ERROR);
  });

  it('lỗi timeout vẫn theo đường cũ (không đọc response)', () => {
    const service = new ServiceBase({ endpoint: '/x' }) as unknown as {
      handleError: (e: AxiosError) => { message: string; type: ApiErrorType };
    };
    const apiError = service.handleError({ code: 'ECONNABORTED' } as AxiosError);
    expect(apiError.type).toBe(ApiErrorType.TIMEOUT_ERROR);
    expect(apiError.message).toBe('Request timeout');
  });

  it('lỗi mạng (không có response) vẫn theo đường cũ', () => {
    const service = new ServiceBase({ endpoint: '/x' }) as unknown as {
      handleError: (e: AxiosError) => { message: string; type: ApiErrorType };
    };
    const apiError = service.handleError({ message: 'Network Error' } as AxiosError);
    expect(apiError.type).toBe(ApiErrorType.NETWORK_ERROR);
    expect(apiError.message).toBe('Network error - please check your connection');
  });
});
