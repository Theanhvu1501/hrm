import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigServiceModule } from './config-service.module';
import {
  createAppLogger,
  LoggingInterceptor,
  GlobalExceptionFilter,
} from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    ConfigServiceModule,
    {
      logger: createAppLogger('config'),
    },
  );

  // ── trust proxy: CỐ Ý để `false` ───────────────────────────────────────
  // `req.ip` được dùng để đối chiếu địa điểm chấm công `loai='wifi'`, nên nó
  // là một giá trị bảo mật: tin nhầm thì nhân viên ngồi nhà tự khai IP văn
  // phòng là chấm công hợp lệ.
  //
  // Khảo sát chuỗi proxy thực tế trong repo (22/07/2026):
  //   client → gateway (:4000) → config-service (:4007)   = 1 chặng đã biết.
  // NHƯNG `apps/gateway/src/controllers/gateway.controller.ts` forward
  // nguyên `...req.headers` sang config-service và KHÔNG tự thêm chặng của
  // mình vào `X-Forwarded-For`. Hệ quả: header `X-Forwarded-For` mà
  // config-service nhận được là header do CHÍNH CLIENT đặt, không có chặng
  // nào đáng tin. Đặt `trust proxy = 1` ở đây sẽ khiến Express lấy đúng giá
  // trị client tự bịa — tức là quay lại y nguyên lỗ hổng.
  // Ngoài ra số chặng đứng TRƯỚC gateway khi triển khai thật (nginx/CDN)
  // chưa được xác nhận.
  //
  // Vì vậy chọn phương án an toàn: không tin header, `req.ip` = địa chỉ
  // socket. Đánh đổi: mọi lượt chấm `phuongThuc='wifi'` sẽ thấy IP của
  // gateway chứ không phải IP của nhân viên, nên luôn bị gắn `ngoaiVung:
  // true` (fail-safe: chặt hơn chứ không lỏng hơn).
  //
  // Để bật lại đối chiếu wifi, cần LÀM CẢ HAI:
  //   1. Sửa gateway ghi đè `x-forwarded-for` bằng IP client mà chính gateway
  //      nhìn thấy (xoá giá trị client gửi lên), trong `options.headers` của
  //      `GatewayController.forward()`.
  //   2. Đổi dòng dưới thành `app.set('trust proxy', <số chặng thật>)` — bằng
  //      số proxy đứng giữa client và config-service (1 nếu gateway là biên,
  //      2 nếu có thêm nginx trước gateway...). TUYỆT ĐỐI không dùng `true`.
  app.set('trust proxy', false);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors();

  const port = process.env.PORT || 4007;
  await app.listen(port);
  console.log(`Config Service is running on port ${port}`);
}
bootstrap();
