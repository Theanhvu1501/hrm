import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';
import { UpdateEmployeeDto } from './update-employee.dto';

/**
 * Test này khoá trực tiếp decorator class-validator trên CreateEmployeeDto —
 * không đi qua service.
 *
 * Lý do: nhan-vien.service.spec.ts gọi thẳng service.create(...)/update(...)
 * với object thường (`as any`), và ts-jest ở repo này chỉ transpile (không
 * type-check), nên hoàn toàn bỏ qua tầng class-validator lẫn kiểu dữ liệu.
 * Nếu ai đó lỡ xoá cột `choPhepChamNgoaiVung` khỏi entity/DTO, toàn bộ test
 * service vẫn xanh 100% — cờ cấp phép chấm công ngoài vùng của HR âm thầm
 * không còn tác dụng gì mà không ai biết. Test này là tuyến phòng thủ duy
 * nhất canh trực tiếp @IsBoolean() choPhepChamNgoaiVung?: boolean.
 */

function timDoiLoiTruong(
  errors: ValidationError[],
  property: string,
): ValidationError | undefined {
  return errors.find((e) => e.property === property);
}

const BASE_HOP_LE = {
  hoTen: 'Nguyễn Văn Hải',
  cccd: '079123456789',
};

describe('CreateEmployeeDto — choPhepChamNgoaiVung', () => {
  it('chấp nhận giá trị boolean', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      ...BASE_HOP_LE,
      choPhepChamNgoaiVung: true,
    });

    const errors = await validate(dto);

    expect(timDoiLoiTruong(errors, 'choPhepChamNgoaiVung')).toBeUndefined();
  });

  it('không truyền thì không phát sinh lỗi — trường là optional', async () => {
    const dto = plainToInstance(CreateEmployeeDto, { ...BASE_HOP_LE });

    const errors = await validate(dto);

    expect(timDoiLoiTruong(errors, 'choPhepChamNgoaiVung')).toBeUndefined();
  });

  it("từ chối giá trị không phải boolean (chuỗi 'true') với ràng buộc isBoolean", async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      ...BASE_HOP_LE,
      choPhepChamNgoaiVung: 'true',
    });

    const errors = await validate(dto);
    const loi = timDoiLoiTruong(errors, 'choPhepChamNgoaiVung');

    expect(loi).toBeDefined();
    expect(loi?.constraints).toHaveProperty('isBoolean');
  });

  it('không bị coi là trường lạ dưới cấu hình pipe thật của production (whitelist + forbidNonWhitelisted)', async () => {
    // main.ts bật whitelist:true + forbidNonWhitelisted:true cho MỌI DTO của
    // config-service. class-validator chỉ biết một property "hợp lệ" khi nó
    // có ít nhất một decorator đăng ký metadata — property không có decorator
    // nào (kể cả khi vẫn tồn tại trên class hoặc bị xoá hẳn) sẽ bị coi là dư
    // thừa và bị chặn với lỗi `whitelistValidation`. Đây là mô phỏng đúng cơ
    // chế "cờ HR đặt bị strip/chặn im lặng" mà DTO đã bị xoá decorator sẽ gặp
    // phải ở production, không phải chỉ gọi plainToInstance() trần trụi (mặc
    // định class-transformer luôn copy nguyên property lạ nên không bắt được
    // lỗi này).
    const dto = plainToInstance(CreateEmployeeDto, {
      ...BASE_HOP_LE,
      choPhepChamNgoaiVung: true,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const loi = timDoiLoiTruong(errors, 'choPhepChamNgoaiVung');

    expect(loi).toBeUndefined();
  });
});

/**
 * Bug đã thực sự xảy ra trên production: 7 trường lương của P4-A có trong
 * entity + FE nhưng KHÔNG có trong DTO, mà app bật `forbidNonWhitelisted` →
 * `PUT /nhan-vien/:id` trả 400 và tab "Lương" im lặng không lưu được gì.
 *
 * `validate(dto)` trần không thấy lỗi này (nó xảy ra ở tầng ValidationPipe),
 * nên describe dưới dựng đúng pipe của `main.ts` để canh.
 */
describe('CreateEmployeeDto — qua ValidationPipe như main.ts', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const meta: ArgumentMetadata = { type: 'body', metatype: CreateEmployeeDto };

  it('không chặn payload đầy đủ trường lương (P4-A + P4.1)', async () => {
    const payload = {
      ...BASE_HOP_LE,
      luongThoaThuan: 15_000_000,
      mucKhaiBao: 5_500_000,
      phuCapCoDinh: 500_000,
      soNguoiPhuThuoc: 2,
      dongBH: true,
      thoiVu: false,
      camKet: false,
      hopDongThu2: true,
      cauHinhLuongRieng: {
        congChuan: 26,
        thuViecTyLe: 0.9,
        bhxhTyLe: 0.105,
        bhxhCanCu: 'LUONG_THOA_THUAN',
      },
    };

    const ketQua = await pipe.transform(payload, meta);

    expect(ketQua).toMatchObject(payload);
  });

  it('giữ được giá trị false/0 (không bị coi là thiếu)', async () => {
    const ketQua = await pipe.transform(
      {
        ...BASE_HOP_LE,
        dongBH: false,
        luongThoaThuan: 0,
        cauHinhLuongRieng: { thuViecTyLe: 0 },
      },
      meta,
    );

    expect(ketQua.dongBH).toBe(false);
    expect(ketQua.luongThoaThuan).toBe(0);
    expect(ketQua.cauHinhLuongRieng?.thuViecTyLe).toBe(0);
  });

  it('vẫn chặn trường lạ ngoài whitelist', async () => {
    await expect(
      pipe.transform({ ...BASE_HOP_LE, khongCoTruongNay: 1 }, meta),
    ).rejects.toThrow();
  });

  it('từ chối tỷ lệ ngoài [0,1] và bhxhCanCu lạ', async () => {
    await expect(
      pipe.transform(
        { ...BASE_HOP_LE, cauHinhLuongRieng: { thuViecTyLe: 90 } },
        meta,
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { ...BASE_HOP_LE, cauHinhLuongRieng: { bhxhCanCu: 'LUNG_TUNG' } },
        meta,
      ),
    ).rejects.toThrow();
  });
});

describe('CreateEmployeeDto — ngayChinhThuc (P3.8)', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const meta: ArgumentMetadata = {
    type: 'body',
    metatype: CreateEmployeeDto,
    data: '',
  };

  it('nhận ngayChinhThuc, không bị forbidNonWhitelisted đá ra', async () => {
    const ketQua: any = await pipe.transform(
      { hoTen: 'Nguyễn Văn A', cccd: '001', ngayChinhThuc: '2026-10-01' },
      meta,
    );
    expect(ketQua.ngayChinhThuc).toBe('2026-10-01');
  });

  it('cho phép vắng mặt — người đang thử việc chưa có ngày chính thức', async () => {
    const ketQua: any = await pipe.transform(
      { hoTen: 'Nguyễn Văn B', cccd: '002' },
      meta,
    );
    expect(ketQua.ngayChinhThuc).toBeUndefined();
  });
});

/**
 * Sự cố production 2026-09-17: HR dán dữ liệu nhân viên từ file Excel sang
 * form "Thêm nhân viên". Ô Email nhận được chuỗi `"ddthuyanh@gmail.com "` —
 * dư đúng một dấu cách vô hình ở cuối — và `@IsEmail` từ chối. Cả form 400,
 * người dùng chỉ thấy "Validation failed", bấm lại 5 lần đều hỏng y hệt vì
 * nhìn trên màn hình không có gì sai cả.
 *
 * Excel/Word còn hay kèm cả dấu cách cứng (U+00A0) và ký tự rộng-không
 * (U+200B) — mắt thường không phân biệt được với dấu cách thường.
 */
describe('CreateEmployeeDto — chuẩn hoá chuỗi dán từ Excel', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const meta: ArgumentMetadata = { type: 'body', metatype: CreateEmployeeDto };

  it('email dư dấu cách hai đầu vẫn nhận, và được lưu ở dạng đã cắt', async () => {
    const kq: any = await pipe.transform(
      { ...BASE_HOP_LE, email: '  ddthuyanh@gmail.com ' },
      meta,
    );
    expect(kq.email).toBe('ddthuyanh@gmail.com');
  });

  it('dấu cách cứng (U+00A0) và ký tự rộng-không (U+200B) cũng bị dọn', async () => {
    const kq: any = await pipe.transform(
      { ...BASE_HOP_LE, email: 'ddthuyanh@gmail.com ', mst: '​040177000610' },
      meta,
    );
    expect(kq.email).toBe('ddthuyanh@gmail.com');
    expect(kq.mst).toBe('040177000610');
  });

  it('họ tên và các ô chữ khác cũng được cắt đầu/cuối', async () => {
    const kq: any = await pipe.transform(
      {
        hoTen: ' Đinh Đặng Thuỳ Anh ',
        cccd: ' 040177000610 ',
        noiCapCccd: 'Cục Cảnh sát QLHC về TTXH ',
        soDienThoai: ' 0912345678',
        diaChi: ' Số 26 Ngõ 172 Thái Thịnh ',
      },
      meta,
    );
    expect(kq.hoTen).toBe('Đinh Đặng Thuỳ Anh');
    expect(kq.cccd).toBe('040177000610');
    expect(kq.noiCapCccd).toBe('Cục Cảnh sát QLHC về TTXH');
    expect(kq.soDienThoai).toBe('0912345678');
    expect(kq.diaChi).toBe('Số 26 Ngõ 172 Thái Thịnh');
  });

  it('ô chỉ toàn dấu cách = bỏ trống, không lưu chuỗi rác', async () => {
    const kq: any = await pipe.transform({ ...BASE_HOP_LE, mst: '   ' }, meta);
    expect(kq.mst).toBe('');
  });

  it('họ tên toàn dấu cách bị từ chối như bỏ trống, không lưu " "', async () => {
    await expect(
      pipe.transform({ hoTen: '   ', cccd: '040177000610' }, meta),
    ).rejects.toThrow();
  });

  it('dấu cách GIỮA các từ được giữ nguyên', async () => {
    const kq: any = await pipe.transform(
      { ...BASE_HOP_LE, hoTen: 'Đinh Đặng Thuỳ Anh' },
      meta,
    );
    expect(kq.hoTen).toBe('Đinh Đặng Thuỳ Anh');
  });
});

/**
 * `UpdateEmployeeDto` là `PartialType(CreateEmployeeDto)`. Nó có kế thừa
 * metadata của `@Transform` hay không là chi tiết nội bộ của
 * `@nestjs/mapped-types` — nếu một bản nâng cấp nào đó thôi kế thừa, màn SỬA
 * hồ sơ sẽ lại 400 vì dấu cách thừa y như lỗi 2026-09-17 mà không test nào
 * biết. Sửa hồ sơ là đường HR đi nhiều hơn cả thêm mới.
 */
describe('UpdateEmployeeDto — kế thừa chuẩn hoá chuỗi từ CreateEmployeeDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const meta: ArgumentMetadata = { type: 'body', metatype: UpdateEmployeeDto };

  it('email dư dấu cách khi SỬA hồ sơ cũng được cắt, không trả 400', async () => {
    const kq: any = await pipe.transform(
      { email: ' ddthuyanh@gmail.com ' },
      meta,
    );
    expect(kq.email).toBe('ddthuyanh@gmail.com');
  });
});
