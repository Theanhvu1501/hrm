import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { SetDayDto } from './set-day.dto';

/**
 * Review round 1 (Task 4): `ngay` chỉ có `@Min(1)`, không có `@Max`. Một ô
 * `hr_sua` với `ngay` lớn hơn số ngày thật của tháng (ví dụ PATCH `{ngay:31}`
 * lên dòng tháng 2, hoặc dữ liệu bẩn) là xoá vĩnh viễn một ô mà spec gọi là
 * bất khả xâm phạm khi `generate()` chạy lại — vòng lặp dựng `oMoi` chỉ đi
 * qua các ngày thật của tháng (1..N), ô có `ngay` ngoài khoảng đó không được
 * mang theo trừ khi được chặn ngay từ đầu vào. `@Max(31)` không tự nó đủ
 * (tháng 2 vẫn nhận `ngay:29` sai), nhưng chặn được lớp lỗi rõ ràng nhất
 * (ngay=32, ngay=99, ...) ngay ở tầng validate — lớp còn lại (29/30/31 sai
 * theo từng tháng cụ thể) đã được `generate()` tự bảo vệ ở Task 4 review
 * round 1 (xem bang-cong.service.ts — ô hr_sua ngoài `cacNgayTrongThang`
 * vẫn được mang theo, không bị xoá).
 */
describe('SetDayDto — ngay', () => {
  it('chấp nhận ngay trong khoảng 1..31', async () => {
    const dto = plainToInstance(SetDayDto, { ngay: 31, kyHieu: 'X' });

    const errors = await validate(dto);

    expect(errors.find((e: ValidationError) => e.property === 'ngay')).toBeUndefined();
  });

  it('từ chối ngay > 31', async () => {
    const dto = plainToInstance(SetDayDto, { ngay: 32, kyHieu: 'X' });

    const errors = await validate(dto);

    expect(errors.find((e: ValidationError) => e.property === 'ngay')).toBeDefined();
  });

  it('từ chối ngay < 1', async () => {
    const dto = plainToInstance(SetDayDto, { ngay: 0, kyHieu: 'X' });

    const errors = await validate(dto);

    expect(errors.find((e: ValidationError) => e.property === 'ngay')).toBeDefined();
  });
});
