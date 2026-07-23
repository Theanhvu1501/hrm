import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  maLoiChamCong,
  MA_LOI_THIET_BI,
  attendanceRecordService,
} from './attendanceRecordService';
import { ServiceBase } from './base/service-base';
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

/** Thay `super.get` bằng mock. Xem chú thích trên: phải là prototype. */
function gia(ketQua: unknown) {
  return vi.spyOn(ServiceBase.prototype as any, 'get').mockResolvedValue(ketQua);
}

describe('attendanceRecordService.cuaToi', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('gọi đúng endpoint /cua-toi kèm khoảng ngày', async () => {
    const get = gia([]);

    await attendanceRecordService.cuaToi('2026-07-21', '2026-07-27');

    expect(get).toHaveBeenCalledWith({
      endpoint: '/cua-toi',
      params: { tuNgay: '2026-07-21', denNgay: '2026-07-27' },
    });
  });

  /**
   * Chỉ kiểm tra tham số gọi API là chưa đủ: nếu ai đó lỡ xoá
   * `.map(this.transform)`, test trên vẫn xanh. Đưa một bản ghi thô có
   * `_id` (dạng Mongo) để buộc phải đi qua transform() mới ra `id`.
   */
  it('map bản ghi thô qua transform (vd. _id -> id)', async () => {
    gia([
      {
        _id: 'rec1',
        employeeId: 'e1',
        ngay: '2026-07-21',
        loai: 'vao',
        thoiDiem: '2026-07-21T01:00:00.000Z',
      },
    ]);

    const kq = await attendanceRecordService.cuaToi('2026-07-21', '2026-07-27');

    expect(kq).toEqual([
      expect.objectContaining({
        id: 'rec1',
        employeeId: 'e1',
        ngay: '2026-07-21',
        loai: 'vao',
        thoiDiem: '2026-07-21T01:00:00.000Z',
        ngoaiVung: false,
        soPhutDiMuon: 0,
        soPhutVeSom: 0,
        laNgayNghi: false,
        nguonTao: 'tu_cham',
      }),
    ]);
    expect(kq[0]).not.toHaveProperty('_id');
  });
});

describe('attendanceRecordService.homNay', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('đọc soCong, phongBan và diaDiem từ backend', async () => {
    gia({
      ngay: '2026-07-23',
      ngayCong: '2026-07-23',
      nhanVien: { id: 'e1', hoTen: 'Nguyễn Văn Hải', employeeCode: 'NV0001' },
      phongBan: 'Phòng Kỹ thuật',
      ca: null,
      diaDiem: [{ id: 'l1', ten: 'Văn phòng HN', loai: 'gps', banKinh: 100 }],
      soCong: 1,
      hanhDongKeTiep: 'vao',
      banGhi: [],
    });

    const kq = await attendanceRecordService.homNay();

    expect(kq.soCong).toBe(1);
    expect(kq.phongBan).toBe('Phòng Kỹ thuật');
    expect(kq.diaDiem).toEqual([
      { id: 'l1', ten: 'Văn phòng HN', loai: 'gps', banKinh: 100 },
    ]);
  });

  /**
   * Backend cũ (chưa deploy Task 1) không có ba trường này. Màn hình phải
   * mất tính năng chứ không được vỡ — cùng lý do `ngayCong` đã lùi về
   * `ngay` khi thiếu.
   */
  it('lùi về giá trị an toàn khi backend cũ chưa trả ba trường mới', async () => {
    gia({
      ngay: '2026-07-23',
      nhanVien: { id: 'e1', hoTen: 'Nguyễn Văn Hải' },
      hanhDongKeTiep: 'vao',
      banGhi: [],
    });

    const kq = await attendanceRecordService.homNay();

    expect(kq.soCong).toBe(0);
    expect(kq.diaDiem).toEqual([]);
    expect(kq.phongBan).toBeUndefined();
  });

  /**
   * Backend HIỆN TẠI gửi `null` cho trạng thái "đã vào, chờ ra". Nuốt nó
   * thành 0 sẽ khiến màn hình nói "Chưa tính" ngay sau khi người ta vừa
   * bấm chấm vào — đúng cái hiểu nhầm mà việc tách null/0 sinh ra để tránh.
   */
  it('giữ nguyên soCong null của backend, không gộp thành 0', async () => {
    gia({
      ngay: '2026-07-23',
      ngayCong: '2026-07-23',
      nhanVien: { id: 'e1', hoTen: 'Nguyễn Văn Hải' },
      ca: null,
      diaDiem: [],
      soCong: null,
      hanhDongKeTiep: 'ra',
      banGhi: [],
    });

    const kq = await attendanceRecordService.homNay();

    expect(kq.soCong).toBeNull();
  });
});
