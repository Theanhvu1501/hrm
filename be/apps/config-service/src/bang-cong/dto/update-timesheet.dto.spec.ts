// PHẢI đứng trước mọi import khác: `UpdateTimesheetDto.chiTietNgay` dùng
// `@Type(() => ChiTietNgayDto)` (class-transformer), decorator này đọc
// `Reflect.getMetadata('design:type', ...)` ngay lúc class được decorate —
// tức là ngay lúc module `update-timesheet.dto.ts` được require. Thiếu dòng
// này, file test đứng riêng lẻ (không đi qua @nestjs/common trước đó để nạp
// sẵn polyfill) sẽ ném `TypeError: Reflect.getMetadata is not a function`
// ngay từ import, chưa kịp chạy test nào.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ChiTietNgayDto, UpdateTimesheetDto } from './update-timesheet.dto';

/**
 * Review round 1 (Task 4): `update()` gán thẳng cả mảng `chiTietNgay` của
 * DTO đè lên entity. Trước fix, `ChiTietNgayDto` chỉ khai `ngay`/`kyHieu` —
 * `main.ts` bật `forbidNonWhitelisted`, nên một client gửi lại nguyên ô đã
 * đọc từ GET (có `nguon`/`canhBao` do `generate()` điền) sẽ bị 400 CẢ FORM.
 * Nếu ai đó "sửa" bằng cách nới lỏng thành `whitelist: false` ở đâu đó thay
 * vì khai đủ trường, request sẽ lọt qua nhưng ÂM THẦM bóc mất `nguon` khỏi
 * từng ô — mọi ô `tu_dong` biến thành "không nguồn" (`nguonCuaO` đọc là
 * `hr_sua`) và bị generate() coi là bất khả xâm phạm mãi mãi. Test này khoá
 * đúng cấu hình ValidationPipe thật của main.ts (`whitelist: true,
 * forbidNonWhitelisted: true`), không phải `validate(dto)` trần — nếu không
 * field lạ sẽ không bao giờ bị báo lỗi và test luôn xanh bất kể DTO đúng hay
 * sai.
 */

const TUY_CHON_KHOP_MAIN = { whitelist: true, forbidNonWhitelisted: true };

function timDoiLoiTruong(
  errors: ValidationError[],
  property: string,
): ValidationError | undefined {
  return errors.find((e) => e.property === property);
}

describe('ChiTietNgayDto — nguon/canhBao', () => {
  it('chấp nhận ô kèm nguon và canhBao (round-trip từ GET)', async () => {
    const dto = plainToInstance(ChiTietNgayDto, {
      ngay: 3,
      kyHieu: 'X',
      nguon: 'tu_dong',
      canhBao: ['thieu_gio_ra'],
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors).toEqual([]);
  });

  it('không truyền nguon/canhBao thì không phát sinh lỗi — cả hai đều optional', async () => {
    const dto = plainToInstance(ChiTietNgayDto, { ngay: 3, kyHieu: 'X' });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors).toEqual([]);
  });

  it('canhBao không phải mảng chuỗi bị từ chối', async () => {
    const dto = plainToInstance(ChiTietNgayDto, {
      ngay: 3,
      kyHieu: 'X',
      canhBao: 'thieu_gio_ra', // phải là mảng, không phải chuỗi trần
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(timDoiLoiTruong(errors, 'canhBao')).toBeDefined();
  });

  it('vẫn từ chối trường thật sự lạ (không phải nguon/canhBao)', async () => {
    const dto = plainToInstance(ChiTietNgayDto, {
      ngay: 3,
      kyHieu: 'X',
      truongLa: 'gì đó',
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateTimesheetDto — chiTietNgay lồng ChiTietNgayDto', () => {
  it('mảng chiTietNgay kèm nguon/canhBao ở mọi ô đều hợp lệ', async () => {
    const dto = plainToInstance(UpdateTimesheetDto, {
      chiTietNgay: [
        { ngay: 1, kyHieu: 'X', nguon: 'tu_dong' },
        { ngay: 2, kyHieu: 'CT', nguon: 'hr_sua', canhBao: [] },
      ],
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors).toEqual([]);
  });
});
