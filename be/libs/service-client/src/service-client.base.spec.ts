import { ConfigService } from '@nestjs/config';
import { BaseServiceClient } from './service-client.base';

// Concrete subclass để lộ mapHttpError (protected) cho test.
class TestClient extends BaseServiceClient {
  public map<T>(statusCode: number, body: unknown) {
    return this.mapHttpError<T>(statusCode, body);
  }
}

describe('BaseServiceClient.mapHttpError', () => {
  let client: TestClient;

  beforeEach(() => {
    client = new TestClient({ get: jest.fn() } as unknown as ConfigService);
  });

  it('shape NestJS mặc định (identity): lấy message top-level + map status→CONFLICT', () => {
    // identity trả: { statusCode: 409, message: "...", error: "Conflict" }
    const res = client.map(409, {
      statusCode: 409,
      message: 'Người dùng đã là thành viên của công ty này',
      error: 'Conflict',
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CONFLICT');
    expect(res.error?.message).toBe('Người dùng đã là thành viên của công ty này');
  });

  it('shape service nội bộ (GlobalExceptionFilter): giữ nguyên code + message', () => {
    const res = client.map(404, {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy công ty' },
    });
    expect(res.error?.code).toBe('NOT_FOUND');
    expect(res.error?.message).toBe('Không tìm thấy công ty');
  });

  it('status không map được → HTTP_ERROR_<status> + message mặc định', () => {
    const res = client.map(418, {});
    expect(res.error?.code).toBe('HTTP_ERROR_418');
    expect(res.error?.message).toBe('HTTP Error 418');
  });

  it('map các status thông dụng sang mã ngữ nghĩa', () => {
    expect(client.map(400, {}).error?.code).toBe('VALIDATION_ERROR');
    expect(client.map(401, {}).error?.code).toBe('UNAUTHORIZED');
    expect(client.map(403, {}).error?.code).toBe('FORBIDDEN');
    expect(client.map(409, {}).error?.code).toBe('CONFLICT');
  });
});
