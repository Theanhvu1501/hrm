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
  heSoTra: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3, ngay_dem: 1.5 },
  heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3, ngay_dem: 1.5 },
  khungGioDem: { tu: '22:00', den: '06:00' },
  uuTienLoai: ['ngay_le', 'ngay_nghi', 'ngay_dem', 'ngay_thuong'],
  mienThueChenh: ['ngay_dem'],
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
        lamThem: { ...lamThemHopLe, cheDoBu: 'chi_nghi_bu', heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3, ngay_dem: 1.5 } },
      }),
    ).resolves.toBeDefined();
  });

  // 2. chi_nghi_bu dưới sàn ở ngay_le (1.0 < 3.0) — nghỉ bù là bù DUY NHẤT ở
  //    chế độ này, tích thiếu là trả thiếu công thật. Thông điệp phải nêu
  //    đúng TRƯỜNG (ngay_le) và đúng SÀN (3.0), không phải một câu chung chung.
  it('2. chi_nghi_bu + {1.5,2,1.0} → từ chối, nêu đúng ngay_le và sàn 3.0', async () => {
    const loi = await layLoi(
      chay({
        lamThem: { ...lamThemHopLe, cheDoBu: 'chi_nghi_bu', heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 1.0, ngay_dem: 1.5 } },
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
        lamThem: { ...lamThemHopLe, cheDoBu: 'nghi_bu_va_chenh', heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3, ngay_dem: 1.5 } },
      }),
    );
    expect(loi).toBeDefined();
    expect(loi.getResponse().message.join(' ')).toMatch(/1\.0/);
  });

  // 4. nghi_bu_va_chenh với hệ số ĐÃ đúng 1.0 cả ba — Critical 2 của review:
  //    lý do từ chối bây giờ CHỈ có thể là "chế độ chưa hỗ trợ", KHÔNG được
  //    lặp lại thông điệp hệ số (đó sẽ là nói dối một admin đã cấu hình đúng).
  //    Case 4 và case 5 rớt vì CÙNG một lý do (chế độ chưa hỗ trợ) — đúng là
  //    vậy, không cần ép hai câu khác nhau giả tạo. Cái cần kiểm là thông điệp
  //    nêu ĐÚNG TÊN chế độ bị từ chối, để hai câu tự khác nhau vì nội dung
  //    thật sự khác nhau (case 4 nêu "nghỉ bù và trả chênh", case 5 nêu
  //    "chỉ trả tiền"), chứ không phải vì bị ép khác nhau.
  it('4. nghi_bu_va_chenh + {1,1,1} → từ chối vì CHẾ ĐỘ chưa hỗ trợ, nêu đúng tên chế độ', async () => {
    const loi = await layLoi(
      chay({
        lamThem: { ...lamThemHopLe, cheDoBu: 'nghi_bu_va_chenh', heSoTichQuy: { ngay_thuong: 1, ngay_nghi: 1, ngay_le: 1, ngay_dem: 1 } },
      }),
    );
    expect(loi).toBeDefined();
    const noiDung = loi.getResponse().message.join(' ');
    expect(noiDung).toMatch(/chưa được hỗ trợ/);
    expect(noiDung).toMatch(/nghỉ bù và trả chênh/);
    // Net thật của Critical 2: không được lặp lại thông điệp hệ số khi hệ số
    // đã đúng — nếu thiếu dòng này, một message chứa cả hai câu vẫn "pass".
    expect(noiDung).not.toMatch(/1\.0 cả ba/);
  });

  // 5. chi_tien — chưa nối bảng lương ở chặng này, hệ số không liên quan.
  it('5. chi_tien → từ chối vì chế độ chưa hỗ trợ, nêu đúng tên chế độ', async () => {
    const loi = await layLoi(
      chay({ lamThem: { ...lamThemHopLe, cheDoBu: 'chi_tien' } }),
    );
    expect(loi).toBeDefined();
    const noiDung = loi.getResponse().message.join(' ');
    expect(noiDung).toMatch(/chưa được hỗ trợ/);
    expect(noiDung).toMatch(/chỉ trả tiền/);
  });

  it('từ chối soGioMoiNgay <= 0', async () => {
    await expect(chay({ soGioMoiNgay: 0 })).rejects.toThrow();
  });

  it('từ chối khoá lạ', async () => {
    await expect(chay({ soGioMoiNgayy: 8 })).rejects.toThrow();
  });
});

describe('CauHinhLamThemDto — bảng hệ số mở (P4.2b)', () => {
  it('nhận cấu hình đầy đủ bốn loại, có ca đêm', async () => {
    await expect(chay({ lamThem: lamThemHopLe })).resolves.toBeDefined();
  });

  it('từ chối khi uuTienLoai có khoá thiếu trong heSoTra', async () => {
    // Thiếu khoá → hệ số undefined → NaN, mà NaN đi qua lamTronGio() vẫn là
    // NaN rồi nằm im trong DB, chỉ lộ ra khi kế toán nhìn bảng lương.
    const loi = await layLoi(
      chay({
        lamThem: {
          ...lamThemHopLe,
          heSoTra: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 },
        },
      }),
    );
    expect(JSON.stringify(loi.getResponse().message)).toMatch(/heSoTra.*ngay_dem/i);
  });

  it('từ chối khi uuTienLoai có khoá thiếu trong heSoTichQuy', async () => {
    const loi = await layLoi(
      chay({
        lamThem: {
          ...lamThemHopLe,
          // CỐ Ý thiếu `ngay_dem` — đừng "sửa" thành đủ bốn khoá.
          heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 },
        },
      }),
    );
    expect(JSON.stringify(loi.getResponse().message)).toMatch(
      /heSoTichQuy.*ngay_dem/i,
    );
  });

  it('từ chối uuTienLoai rỗng', async () => {
    const loi = await layLoi(chay({ lamThem: { ...lamThemHopLe, uuTienLoai: [] } }));
    expect(JSON.stringify(loi.getResponse().message)).toMatch(/uuTienLoai/i);
  });

  it('từ chối uuTienLoai có khoá trùng', async () => {
    const loi = await layLoi(
      chay({
        lamThem: {
          ...lamThemHopLe,
          uuTienLoai: ['ngay_dem', 'ngay_dem', 'ngay_thuong'],
        },
      }),
    );
    expect(JSON.stringify(loi.getResponse().message)).toMatch(/trùng/i);
  });

  it('từ chối hệ số ≤ 0 — hệ số 0 làm dòng lương bằng 0, âm làm nó âm', async () => {
    const loi = await layLoi(
      chay({
        lamThem: {
          ...lamThemHopLe,
          heSoTra: { ...lamThemHopLe.heSoTra, ngay_dem: 0 },
        },
      }),
    );
    expect(JSON.stringify(loi.getResponse().message)).toMatch(/> 0/);
  });

  it('từ chối mienThueChenh có khoá ngoài uuTienLoai', async () => {
    const loi = await layLoi(
      chay({
        lamThem: { ...lamThemHopLe, mienThueChenh: ['ngay_dem', 'ngay_go_nham'] },
      }),
    );
    expect(JSON.stringify(loi.getResponse().message)).toMatch(/mienThueChenh/i);
  });

  it('khungGioDem null hợp lệ — công ty không có ca đêm', async () => {
    await expect(
      chay({ lamThem: { ...lamThemHopLe, khungGioDem: null } }),
    ).resolves.toBeDefined();
  });

  it('từ chối khungGioDem sai dạng HH:mm', async () => {
    await expect(
      chay({ lamThem: { ...lamThemHopLe, khungGioDem: { tu: '25:00', den: '06:00' } } }),
    ).rejects.toThrow();
  });

  it('từ chối khungGioDem hai mốc bằng nhau', async () => {
    const loi = await layLoi(
      chay({ lamThem: { ...lamThemHopLe, khungGioDem: { tu: '22:00', den: '22:00' } } }),
    );
    expect(JSON.stringify(loi.getResponse().message)).toMatch(/khác nhau/i);
  });

  it('vẫn giữ sàn BLLĐ Đ98.1 cho chi_nghi_bu', async () => {
    const loi = await layLoi(
      chay({
        lamThem: {
          ...lamThemHopLe,
          heSoTichQuy: { ...lamThemHopLe.heSoTichQuy, ngay_le: 2 },
        },
      }),
    );
    expect(JSON.stringify(loi.getResponse().message)).toMatch(/3\.0/);
  });

  it('nghi_bu_va_chenh phải có hệ số tích 1.0 ở MỌI loại, kể cả ngay_dem', async () => {
    const loi = await layLoi(
      chay({
        lamThem: {
          ...lamThemHopLe,
          cheDoBu: 'nghi_bu_va_chenh',
          heSoTichQuy: { ngay_thuong: 1, ngay_nghi: 1, ngay_le: 1, ngay_dem: 1.5 },
        },
      }),
    );
    // Không được lọt vì "chưa hỗ trợ" trước khi kịp bắt hệ số sai — đó chính
    // là lỗ hổng trả gấp đôi mà ràng buộc này tồn tại để chặn.
    expect(JSON.stringify(loi.getResponse().message)).toMatch(/ngay_dem/);
  });
});
