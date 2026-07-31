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

  // Chặng P4.2a chưa nối bảng lương. Lưu im lặng rồi hành xử sai là tệ hơn
  // hẳn so với từ chối thẳng.
  it('từ chối chế độ chưa hỗ trợ ở chặng này', async () => {
    const loi = await layLoi(
      chay({ lamThem: { ...lamThemHopLe, cheDoBu: 'chi_tien' } }),
    );
    expect(loi).toBeDefined();
    expect(loi.getResponse().message.join(' ')).toMatch(/chưa được hỗ trợ/);
  });

  // Bảng lương đã trả phần chênh (hệ số − 1); tích quỹ ở 1.5 nữa là trả gấp đôi.
  it('ép heSoTichQuy = 1.0 ở chế độ nghi_bu_va_chenh', async () => {
    const loi = await layLoi(
      chay({
        lamThem: {
          ...lamThemHopLe,
          cheDoBu: 'nghi_bu_va_chenh',
          heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 },
        },
      }),
    );
    expect(loi).toBeDefined();
    expect(loi.getResponse().message.join(' ')).toMatch(/hệ số.*1\.0/);
  });

  it('từ chối soGioMoiNgay <= 0', async () => {
    await expect(chay({ soGioMoiNgay: 0 })).rejects.toThrow();
  });

  it('từ chối khoá lạ', async () => {
    await expect(chay({ soGioMoiNgayy: 8 })).rejects.toThrow();
  });
});
