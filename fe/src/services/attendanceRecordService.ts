import { ServiceBase } from './base/service-base';
import { ApiError } from '@/config/api';

export const MA_LOI_THIET_BI = {
  CHO_DUYET: 'THIET_BI_CHO_DUYET',
  CHUA_DUOC_PHEP: 'THIET_BI_CHUA_DUOC_PHEP',
  BI_TU_CHOI: 'THIET_BI_BI_TU_CHOI',
  BI_THU_HOI: 'THIET_BI_BI_THU_HOI',
  THIEU_DINH_DANH: 'THIET_BI_THIEU_DINH_DANH',
  DU_LIEU_BAT_NHAT: 'THIET_BI_DU_LIEU_BAT_NHAT',
  TRANG_THAI_KHONG_HOP_LE: 'THIET_BI_TRANG_THAI_KHONG_HOP_LE',
} as const;

/** Đứng ngoài bán kính và không được HR cấp phép chấm từ xa. */
export const MA_LOI_NGOAI_BAN_KINH = 'NGOAI_BAN_KINH_CHO_PHEP';

/**
 * Rút `code` backend gửi kèm lỗi 403.
 *
 * ServiceBase (fe/src/services/base/service-base.ts, handleError()) bọc lỗi
 * axios gốc vào ApiError.originalError nguyên vẹn (không bóc .response.data
 * trước), nên ở đây phải tự bóc: err (ApiError) → originalError (AxiosError)
 * → response.data. GlobalExceptionFilter của backend trả
 * { success: false, error: { code, message }, requestId }, nên đọc
 * data.error.code là đường chính. Đọc code thay vì so khớp chuỗi tiếng
 * Việt — đổi câu chữ một lần là FE hỏng im lặng.
 */
export function maLoiChamCong(err: unknown): string | undefined {
  const goc =
    err instanceof ApiError ? (err.originalError as unknown) : err;
  const data = (
    goc as {
      response?: { data?: { error?: { code?: string }; code?: string } };
    }
  )?.response?.data;
  // GlobalExceptionFilter của backend trả
  // { success: false, error: { code, message }, requestId }.
  // Vẫn nhận cả dạng phẳng để không phụ thuộc một tầng bọc duy nhất.
  return data?.error?.code ?? data?.code;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  ngay: string;
  loai: string;          // vao|ra
  thoiDiem: string;      // ISO
  caTen?: string;
  caGioBatDau?: string;
  caGioKetThuc?: string;
  locationTen?: string;
  phuongThuc?: string;
  latitude?: number;
  longitude?: number;
  khoangCachMet?: number;
  ngoaiVung: boolean;
  soPhutDiMuon: number;
  soPhutVeSom: number;
  laNgayNghi: boolean;
  nguonTao: string;      // tu_cham|hr_nhap
  ghiChu?: string;
}

/**
 * Địa điểm chấm công dạng rút gọn cho màn hình nhân viên.
 *
 * Là DANH SÁCH chứ không phải một điểm: nhân viên không được gán địa điểm,
 * backend khớp GPS/wifi/QR với toàn bộ điểm đang bật khi chấm. Giữ tên
 * trường `banKinh` đúng như entity, không đổi thành `banKinhMet`.
 */
export interface DiaDiemChamCongTom {
  id: string;
  ten: string;
  loai: string;
  banKinh?: number;
}

export interface TrangThaiHomNay {
  /** Ngày lịch hôm nay theo giờ VN. */
  ngay: string;
  /**
   * NGÀY CÔNG mà `hanhDongKeTiep` và `banGhi` đang nói tới — khác `ngay` khi
   * đang có một lượt vào của ca qua đêm mở từ ngày hôm trước. Xem
   * `BanGhiChamCong_Service.homNay()`.
   */
  ngayCong: string;
  nhanVien: { id: string; hoTen: string; employeeCode?: string };
  ca: {
    id: string;
    ten: string;
    gioBatDau: string;
    gioKetThuc: string;
    laCaQuaDem: boolean;
  } | null;
  hanhDongKeTiep: 'vao' | 'ra';
  banGhi: AttendanceRecord[];
  phongBan?: string;
  diaDiem: DiaDiemChamCongTom[];
  /**
   * Số công của `ngayCong`. `null` KHÁC `0`: `null` là "đã vào, đang chờ
   * ra" (màn hình hiện "—"), `0` là "chưa có gì để tính".
   */
  soCong: number | null;
}

export interface ChamCongDto {
  deviceId: string;
  phuongThuc: 'gps' | 'wifi' | 'qr';
  latitude?: number;
  longitude?: number;
  doChinhXacMet?: number;
  maQr?: string;
  tenThietBi?: string;
}

export interface HrNhapChamCongDto {
  employeeId: string;
  ngay: string;
  loai: 'vao' | 'ra';
  gio: string;
  ghiChu?: string;
}

export interface AttendanceRecordFilter {
  tuNgay?: string;
  denNgay?: string;
  employeeId?: string;
  ngoaiVung?: boolean | string;
}

class AttendanceRecordService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/ban-ghi-cham-cong' });
  }

  async getList(filter?: AttendanceRecordFilter): Promise<AttendanceRecord[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async homNay(): Promise<TrangThaiHomNay> {
    const res = await super.get<Record<string, any>>({ endpoint: '/hom-nay' });
    return {
      ngay: res.ngay,
      // Lùi về `ngay` để màn hình không vỡ nếu chạy với backend cũ chưa có
      // trường này (giao diện chỉ mất phần xưng hô riêng cho ca qua đêm).
      ngayCong: res.ngayCong ?? res.ngay,
      nhanVien: res.nhanVien,
      ca: res.ca ?? null,
      hanhDongKeTiep: res.hanhDongKeTiep,
      banGhi: (res.banGhi ?? []).map(this.transform),
      phongBan: res.phongBan,
      diaDiem: (res.diaDiem ?? []) as DiaDiemChamCongTom[],
      // CHỈ `undefined` mới lùi về 0 — đó là backend cũ chưa có trường này.
      // `null` là giá trị thật backend gửi cho trạng thái "đã vào, chờ ra",
      // phải đi thẳng qua để màn hình hiện "—" thay vì "Chưa tính". Dùng
      // `?? 0` ở đây sẽ nuốt mất `null` vì `??` không phân biệt hai thứ.
      soCong: res.soCong === undefined ? 0 : res.soCong,
    };
  }

  /**
   * Bản ghi chấm công của chính mình trong một khoảng ngày, cho lịch tuần.
   *
   * Không dùng `getList()`: đường đó gọi `GET /ban-ghi-cham-cong` vốn có
   * AdminGuard ở backend, nhân viên thường sẽ nhận 403.
   */
  async cuaToi(tuNgay: string, denNgay: string): Promise<AttendanceRecord[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      endpoint: '/cua-toi',
      params: { tuNgay, denNgay },
    });
    return res.map(this.transform);
  }

  async checkIn(dto: ChamCongDto): Promise<AttendanceRecord> {
    const res = await this.post<Record<string, unknown>>(dto, {
      endpoint: '/check-in',
    });
    return this.transform(res);
  }

  async checkOut(dto: ChamCongDto): Promise<AttendanceRecord> {
    const res = await this.post<Record<string, unknown>>(dto, {
      endpoint: '/check-out',
    });
    return this.transform(res);
  }

  async hrNhap(dto: HrNhapChamCongDto): Promise<AttendanceRecord> {
    const res = await this.post<Record<string, unknown>>(dto, {
      endpoint: '/hr-nhap',
    });
    return this.transform(res);
  }

  private transform(x: Record<string, unknown>): AttendanceRecord {
    return {
      id: (x._id as string) || (x.id as string),
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      ngay: x.ngay as string,
      loai: x.loai as string,
      thoiDiem: x.thoiDiem as string,
      caTen: x.caTen as string | undefined,
      caGioBatDau: x.caGioBatDau as string | undefined,
      caGioKetThuc: x.caGioKetThuc as string | undefined,
      locationTen: x.locationTen as string | undefined,
      phuongThuc: x.phuongThuc as string | undefined,
      latitude: x.latitude as number | undefined,
      longitude: x.longitude as number | undefined,
      khoangCachMet: x.khoangCachMet as number | undefined,
      ngoaiVung: (x.ngoaiVung as boolean) ?? false,
      soPhutDiMuon: (x.soPhutDiMuon as number) ?? 0,
      soPhutVeSom: (x.soPhutVeSom as number) ?? 0,
      laNgayNghi: (x.laNgayNghi as boolean) ?? false,
      nguonTao: (x.nguonTao as string) ?? 'tu_cham',
      ghiChu: x.ghiChu as string | undefined,
    };
  }
}

export const attendanceRecordService = new AttendanceRecordService();
