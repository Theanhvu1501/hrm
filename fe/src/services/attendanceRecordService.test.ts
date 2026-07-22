import { describe, it, expect } from 'vitest';
import { maLoiChamCong, MA_LOI_THIET_BI } from './attendanceRecordService';
import { ApiError, ApiErrorType } from '@/config/api';

describe('maLoiChamCong', () => {
  it('lấy được code từ ApiError bọc lỗi axios', () => {
    const loiAxios = {
      response: {
        data: {
          success: false,
          error: { code: 'THIET_BI_CHO_DUYET', message: 'Chờ duyệt' },
        },
      },
    };
    const err = new ApiError(
      'Chờ duyệt',
      ApiErrorType.UNKNOWN_ERROR,
      403,
      loiAxios,
    );

    expect(maLoiChamCong(err)).toBe(MA_LOI_THIET_BI.CHO_DUYET);
  });

  it('lấy được code từ lỗi axios trần', () => {
    expect(
      maLoiChamCong({
        response: { data: { error: { code: 'THIET_BI_BI_THU_HOI' } } },
      }),
    ).toBe(MA_LOI_THIET_BI.BI_THU_HOI);
  });

  it('vẫn nhận dạng phẳng (code nằm ngay trong data)', () => {
    expect(
      maLoiChamCong({ response: { data: { code: 'THIET_BI_BI_TU_CHOI' } } }),
    ).toBe(MA_LOI_THIET_BI.BI_TU_CHOI);
  });

  it('trả undefined khi lỗi không mang code', () => {
    expect(maLoiChamCong(new Error('mạng hỏng'))).toBeUndefined();
    expect(maLoiChamCong(undefined)).toBeUndefined();
    expect(maLoiChamCong({ response: {} })).toBeUndefined();
    expect(
      maLoiChamCong({ response: { data: { error: {} } } }),
    ).toBeUndefined();
  });
});
