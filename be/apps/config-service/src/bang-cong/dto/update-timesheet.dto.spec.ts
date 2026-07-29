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

/**
 * Finding K (review wave 2): `ChiTietNgayDto.ngay` chỉ có `@Min(1)`, thiếu
 * `@Max(31)` mà `SetDayDto.ngay` (đường PATCH một ngày) đã có từ round 1 —
 * hai đường ghi khác nhau (PUT nguyên khối `chiTietNgay` qua update() vs
 * PATCH một ngày qua setDay()) có hai hợp đồng validate khác nhau cho CÙNG
 * một trường `ngay`. Cùng lý do đã ghi ở `set-day.dto.spec.ts`: `ngay` ngoài
 * số ngày thật của tháng qua PUT sẽ tạo ô ma mà `generate()` không bao giờ
 * dọn (nó chỉ đi qua `cacNgayTrongThang()`).
 */
describe('ChiTietNgayDto — ngay', () => {
  it('chấp nhận ngay trong khoảng 1..31', async () => {
    const dto = plainToInstance(ChiTietNgayDto, { ngay: 31, kyHieu: 'X' });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(timDoiLoiTruong(errors, 'ngay')).toBeUndefined();
  });

  it('từ chối ngay > 31', async () => {
    const dto = plainToInstance(ChiTietNgayDto, { ngay: 32, kyHieu: 'X' });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(timDoiLoiTruong(errors, 'ngay')).toBeDefined();
  });

  it('từ chối ngay < 1', async () => {
    const dto = plainToInstance(ChiTietNgayDto, { ngay: 0, kyHieu: 'X' });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(timDoiLoiTruong(errors, 'ngay')).toBeDefined();
  });
});

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

/**
 * Finding E (review wave 2): `soLanDiMuon`/`soLanVeSom` trở thành máy tính từ
 * spec §5.3 (đếm bản ghi có soPhutDiMuon/soPhutVeSom > 0 trong tháng — xem
 * generate()/demMuonSom()), nhưng DTO này từng vẫn khai hai trường đó nên HR
 * gõ tay qua RowNoteEditor vẫn "sửa" được — giá trị gõ tay sống sót cho tới
 * lần Tổng hợp kế tiếp rồi bị máy ghi đè không cảnh báo. Xoá khỏi DTO +
 * `forbidNonWhitelisted` (main.ts) khiến client gửi hai trường này bị 400
 * ngay ở tầng validate.
 */
describe('UpdateTimesheetDto — soLanDiMuon/soLanVeSom đã chuyển sang tự tính', () => {
  it('từ chối soLanDiMuon — không còn là input hợp lệ', async () => {
    const dto = plainToInstance(UpdateTimesheetDto, { soLanDiMuon: 2 });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('từ chối soLanVeSom — không còn là input hợp lệ', async () => {
    const dto = plainToInstance(UpdateTimesheetDto, { soLanVeSom: 1 });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('soGioLamThem/ghiChu vẫn hợp lệ như cũ', async () => {
    const dto = plainToInstance(UpdateTimesheetDto, {
      soGioLamThem: 3,
      ghiChu: 'ghi chú',
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors).toEqual([]);
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
