import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

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
