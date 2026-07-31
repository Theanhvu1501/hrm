import { ValidationPipe } from '@nestjs/common';
import { CapNhatCauHinhLuongDto } from './index';

// Dựng ĐÚNG pipe của main.ts. `validate(dto)` trần KHÔNG bắt được
// forbidNonWhitelisted, mà đó chính là lớp lỗi đã làm chết cả form thôi việc.
const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});
const chay = (payload: any) =>
  pipe.transform(payload, { type: 'body', metatype: CapNhatCauHinhLuongDto } as any);

/**
 * `BadRequestException.message` LUÔN là chuỗi tĩnh "Bad Request Exception" —
 * nội dung lỗi thật nằm trong `getResponse().message` (mảng). Muốn phân biệt
 * "chế độ chưa hỗ trợ" với "hệ số sai" phải đọc mảng này, `toThrow(regex)`
 * trên exception không thấy được.
 */
const layLoi = async (promise: Promise<unknown>): Promise<any> => {
  let loi: any;
  try {
    await promise;
  } catch (e) {
    loi = e;
  }
  return loi;
};

const lamThemHopLe = {
  cheDoBu: 'chi_nghi_bu',
  heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 },
  soThangHanDung: 6,
  khiHetHan: 'quy_ra_tien',
};

describe('CapNhatCauHinhLuongDto — cấu hình làm thêm', () => {
  it('nhận cấu hình hợp lệ', async () => {
    await expect(
      chay({ soGioMoiNgay: 8, lamThem: lamThemHopLe }),
    ).resolves.toBeDefined();
  });

  it('nhận soThangHanDung null (không hết hạn)', async () => {
    await expect(
      chay({ lamThem: { ...lamThemHopLe, soThangHanDung: null } }),
    ).resolves.toBeDefined();
  });

  // Ma trận 5 ca dưới đây phải PHÂN BIỆT được nhau qua nội dung thông điệp —
  // không chỉ "có ném lỗi". Review đã bắt một bug thật: cùng regex /hệ số.*1\.0/
  // "pass" y hệt dù nhánh nghi_bu_va_chenh đứng trước hay sau nhánh "chưa hỗ
  // trợ", vì defaultMessage() (bản cũ) đoán lý do một mình từ cheDoBu, không
  // hỏi lại validate() thực sự rớt ở đâu. Ma trận này chốt bằng nội dung cụ
  // thể (tên trường, ngưỡng số) để không thể "pass vì sai lý do" lần nữa.

  // 1. chi_nghi_bu đúng sàn BLLĐ Đ98.1 (1.5 / 2.0 / 3.0) — được chấp nhận.
  it('1. chi_nghi_bu + {1.5,2,3} → được chấp nhận', async () => {
    await expect(
      chay({
        lamThem: { ...lamThemHopLe, cheDoBu: 'chi_nghi_bu', heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 } },
      }),
    ).resolves.toBeDefined();
  });

  // 2. chi_nghi_bu dưới sàn ở ngay_le (1.0 < 3.0) — nghỉ bù là bù DUY NHẤT ở
  //    chế độ này, tích thiếu là trả thiếu công thật. Thông điệp phải nêu
  //    đúng TRƯỜNG (ngay_le) và đúng SÀN (3.0), không phải một câu chung chung.
  it('2. chi_nghi_bu + {1.5,2,1.0} → từ chối, nêu đúng ngay_le và sàn 3.0', async () => {
    const loi = await layLoi(
      chay({
        lamThem: { ...lamThemHopLe, cheDoBu: 'chi_nghi_bu', heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 1.0 } },
      }),
    );
    expect(loi).toBeDefined();
    const noiDung = loi.getResponse().message.join(' ');
    expect(noiDung).toMatch(/ngay_le/);
    expect(noiDung).toMatch(/3\.0/);
  });

  // 3. nghi_bu_va_chenh với hệ số đầy đủ (chưa ép về 1.0) — bảng lương ĐÃ trả
  //    phần chênh, tích quỹ ở 1.5 nữa là trả gấp đôi. Thông điệp phải nói rõ
  //    lý do là HỆ SỐ, không phải "chế độ chưa hỗ trợ" (dù cả hai đều đúng).
  it('3. nghi_bu_va_chenh + {1.5,2,3} → từ chối vì hệ số phải đúng 1.0', async () => {
    const loi = await layLoi(
      chay({
        lamThem: { ...lamThemHopLe, cheDoBu: 'nghi_bu_va_chenh', heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 } },
      }),
    );
    expect(loi).toBeDefined();
    expect(loi.getResponse().message.join(' ')).toMatch(/1\.0/);
  });

  // 4. nghi_bu_va_chenh với hệ số ĐÃ đúng 1.0 cả ba — Critical 2 của review:
  //    lý do từ chối bây giờ CHỈ có thể là "chế độ chưa hỗ trợ", KHÔNG được
  //    lặp lại thông điệp hệ số (đó sẽ là nói dối một admin đã cấu hình đúng).
  it('4. nghi_bu_va_chenh + {1,1,1} → từ chối vì CHẾ ĐỘ chưa hỗ trợ, không phải hệ số', async () => {
    const loi = await layLoi(
      chay({
        lamThem: { ...lamThemHopLe, cheDoBu: 'nghi_bu_va_chenh', heSoTichQuy: { ngay_thuong: 1, ngay_nghi: 1, ngay_le: 1 } },
      }),
    );
    expect(loi).toBeDefined();
    const noiDung = loi.getResponse().message.join(' ');
    expect(noiDung).toMatch(/chưa được hỗ trợ/);
    expect(noiDung).not.toMatch(/1\.0 cả ba/);
  });

  // 5. chi_tien — chưa nối bảng lương ở chặng này, hệ số không liên quan.
  it('5. chi_tien → từ chối vì chế độ chưa hỗ trợ', async () => {
    const loi = await layLoi(
      chay({ lamThem: { ...lamThemHopLe, cheDoBu: 'chi_tien' } }),
    );
    expect(loi).toBeDefined();
    expect(loi.getResponse().message.join(' ')).toMatch(/chưa được hỗ trợ/);
  });

  it('từ chối soGioMoiNgay <= 0', async () => {
    await expect(chay({ soGioMoiNgay: 0 })).rejects.toThrow();
  });

  it('từ chối khoá lạ', async () => {
    await expect(chay({ soGioMoiNgayy: 8 })).rejects.toThrow();
  });
});
