import { describe, it, expect } from 'vitest';
import {
  phanLoaiLoi,
  thongDiepChoTrangThai,
  CHAN_CHAM_CONG,
  THONG_DIEP,
  TrangThai,
} from './trangThai';
import { ApiError, ApiErrorType } from '@/config/api';

/**
 * Dạng phẳng `{ code }` — giữ nguyên bộ test brief mô tả để không mất đường
 * đọc dự phòng của maLoiChamCong().
 */
function loi403(code: string) {
  return new ApiError('x', ApiErrorType.UNKNOWN_ERROR, 403, {
    response: { status: 403, data: { code } },
  });
}

/**
 * Dạng THẬT mà backend trả về (GlobalExceptionFilter):
 * { success:false, error:{ code, message }, requestId } — và message ở đây
 * là chính `message`, khớp với những gì `ServiceBase.handleError()` (đã vá,
 * xem fe/src/services/base/service-base.ts) thật sự đặt vào `ApiError.message`.
 */
function loiThat(status: number, code: string, message: string) {
  return new ApiError(message, ApiErrorType.FORBIDDEN, status, {
    response: { status, data: { success: false, error: { code, message } } },
  });
}

describe('phanLoaiLoi', () => {
  it('404 → chưa liên kết hồ sơ', () => {
    const err = new ApiError('x', ApiErrorType.UNKNOWN_ERROR, 404, {
      response: { status: 404, data: {} },
    });
    expect(phanLoaiLoi(err)).toBe(TrangThai.CHUA_LIEN_KET);
  });

  it('403 THIET_BI_CHO_DUYET → thiết bị chờ duyệt', () => {
    expect(phanLoaiLoi(loi403('THIET_BI_CHO_DUYET'))).toBe(
      TrangThai.THIET_BI_CHO_DUYET,
    );
  });

  it('403 THIET_BI_CHUA_DUOC_PHEP → thiết bị chưa được phép', () => {
    expect(phanLoaiLoi(loi403('THIET_BI_CHUA_DUOC_PHEP'))).toBe(
      TrangThai.THIET_BI_CHUA_DUOC_PHEP,
    );
  });

  it('403 THIET_BI_BI_TU_CHOI → bị từ chối', () => {
    expect(phanLoaiLoi(loi403('THIET_BI_BI_TU_CHOI'))).toBe(
      TrangThai.THIET_BI_BI_TU_CHOI,
    );
  });

  it('403 THIET_BI_BI_THU_HOI → bị thu hồi', () => {
    expect(phanLoaiLoi(loi403('THIET_BI_BI_THU_HOI'))).toBe(
      TrangThai.THIET_BI_BI_THU_HOI,
    );
  });

  it('409 → sai thứ tự vào/ra', () => {
    const err = new ApiError('x', ApiErrorType.UNKNOWN_ERROR, 409, {
      response: { status: 409, data: { message: 'Bạn đã check-in rồi' } },
    });
    expect(phanLoaiLoi(err)).toBe(TrangThai.SAI_THU_TU);
  });

  it('lỗi lạ → lỗi khác, không sập', () => {
    expect(phanLoaiLoi(new Error('mất mạng'))).toBe(TrangThai.LOI_KHAC);
    expect(phanLoaiLoi(undefined)).toBe(TrangThai.LOI_KHAC);
  });

  // ── 3 mã lỗi thiết bị backend thêm sau khi brief được viết ──────────────
  // Cả 3 đều là tình huống bất thường phải liên hệ HR; nếu rơi vào LOI_KHAC
  // thì người dùng đọc "Vui lòng thử lại" rồi bấm lại vô hạn.

  it('403 THIET_BI_THIEU_DINH_DANH → có trạng thái riêng, không phải LOI_KHAC', () => {
    expect(phanLoaiLoi(loi403('THIET_BI_THIEU_DINH_DANH'))).toBe(
      TrangThai.THIET_BI_THIEU_DINH_DANH,
    );
  });

  it('403 THIET_BI_DU_LIEU_BAT_NHAT → có trạng thái riêng', () => {
    expect(phanLoaiLoi(loi403('THIET_BI_DU_LIEU_BAT_NHAT'))).toBe(
      TrangThai.THIET_BI_DU_LIEU_BAT_NHAT,
    );
  });

  it('403 THIET_BI_TRANG_THAI_KHONG_HOP_LE → có trạng thái riêng', () => {
    expect(phanLoaiLoi(loi403('THIET_BI_TRANG_THAI_KHONG_HOP_LE'))).toBe(
      TrangThai.THIET_BI_TRANG_THAI_KHONG_HOP_LE,
    );
  });

  it('đọc được mã từ dạng bọc thật { error: { code } } của backend', () => {
    expect(
      phanLoaiLoi(loiThat(403, 'THIET_BI_CHO_DUYET', 'Thiết bị đang chờ HR duyệt.')),
    ).toBe(TrangThai.THIET_BI_CHO_DUYET);
  });

  it('403 KHÔNG kèm mã thiết bị (vd đã nghỉ việc) → BI_CHAN, không phải LOI_KHAC', () => {
    const err = loiThat(
      403,
      'FORBIDDEN',
      'Hồ sơ nhân viên đã ở trạng thái nghỉ việc nên không thể chấm công.',
    );
    expect(phanLoaiLoi(err)).toBe(TrangThai.BI_CHAN);
  });
});

describe('thongDiepChoTrangThai', () => {
  it('BI_CHAN dùng NGUYÊN VĂN câu của backend — FE không biết lý do bị chặn', () => {
    const err = loiThat(
      403,
      'FORBIDDEN',
      'Hồ sơ nhân viên đã ở trạng thái nghỉ việc nên không thể chấm công.',
    );
    expect(thongDiepChoTrangThai(TrangThai.BI_CHAN, err)).toBe(
      'Hồ sơ nhân viên đã ở trạng thái nghỉ việc nên không thể chấm công.',
    );
  });

  it('SAI_THU_TU dùng câu của backend (nêu đích danh ngày cần HR nhập bù)', () => {
    const err = loiThat(
      409,
      'CONFLICT',
      'Lượt check-in ngày 2026-07-20 chưa được đóng…',
    );
    expect(thongDiepChoTrangThai(TrangThai.SAI_THU_TU, err)).toBe(
      'Lượt check-in ngày 2026-07-20 chưa được đóng…',
    );
  });

  it('BI_CHAN không có câu backend → vẫn có câu dự phòng, không rỗng', () => {
    expect(thongDiepChoTrangThai(TrangThai.BI_CHAN, undefined)).not.toBe('');
  });

  it('trạng thái thiết bị dùng câu FE (trấn an + nói rõ việc cần làm)', () => {
    const err = loiThat(403, 'THIET_BI_CHO_DUYET', 'Thiết bị đang chờ HR duyệt. Liên hệ HR.');
    expect(thongDiepChoTrangThai(TrangThai.THIET_BI_CHO_DUYET, err)).toBe(
      THONG_DIEP[TrangThai.THIET_BI_CHO_DUYET],
    );
  });

  it('mọi trạng thái đều có câu chữ tiếng Việt, không trạng thái nào câm', () => {
    for (const tt of Object.values(TrangThai)) {
      if (tt === TrangThai.SAN_SANG) continue; // sẵn sàng thì không cần nói gì
      expect(thongDiepChoTrangThai(tt, undefined).length).toBeGreaterThan(0);
    }
  });
});

describe('CHAN_CHAM_CONG', () => {
  it('gồm mọi trạng thái thiết bị + chưa liên kết + bị chặn', () => {
    expect(CHAN_CHAM_CONG.has(TrangThai.CHUA_LIEN_KET)).toBe(true);
    expect(CHAN_CHAM_CONG.has(TrangThai.THIET_BI_CHO_DUYET)).toBe(true);
    expect(CHAN_CHAM_CONG.has(TrangThai.THIET_BI_CHUA_DUOC_PHEP)).toBe(true);
    expect(CHAN_CHAM_CONG.has(TrangThai.THIET_BI_BI_TU_CHOI)).toBe(true);
    expect(CHAN_CHAM_CONG.has(TrangThai.THIET_BI_BI_THU_HOI)).toBe(true);
    expect(CHAN_CHAM_CONG.has(TrangThai.THIET_BI_THIEU_DINH_DANH)).toBe(true);
    expect(CHAN_CHAM_CONG.has(TrangThai.THIET_BI_DU_LIEU_BAT_NHAT)).toBe(true);
    expect(CHAN_CHAM_CONG.has(TrangThai.THIET_BI_TRANG_THAI_KHONG_HOP_LE)).toBe(true);
    expect(CHAN_CHAM_CONG.has(TrangThai.BI_CHAN)).toBe(true);
  });

  it('KHÔNG chặn các lỗi tạm thời — người dùng phải còn nút để thử lại', () => {
    expect(CHAN_CHAM_CONG.has(TrangThai.TU_CHOI_VI_TRI)).toBe(false);
    expect(CHAN_CHAM_CONG.has(TrangThai.LOI_VI_TRI)).toBe(false);
    expect(CHAN_CHAM_CONG.has(TrangThai.SAI_THU_TU)).toBe(false);
    expect(CHAN_CHAM_CONG.has(TrangThai.LOI_KHAC)).toBe(false);
    expect(CHAN_CHAM_CONG.has(TrangThai.SAN_SANG)).toBe(false);
  });
});
