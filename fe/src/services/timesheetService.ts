import { ServiceBase } from './base/service-base';

export type TimesheetStatus = 'nhap' | 'chot';

export interface ChiTietNgay {
  ngay: number; // 1..31
  kyHieu: string;
  nguon?: string; // 'tu_dong' | 'hr_sua' — máy điền hay người đã sửa tay
  canhBao?: string[]; // mã cảnh báo backend gắn vào ô, dịch qua nhanCanhBao()
}

export interface KyHieuDef {
  kyHieu: string;
  nhan: string;
  soCong: number;
  /**
   * `ngay_nghi` = ngày vốn không phải ngày làm việc (nghỉ theo lịch tuần),
   * tách khỏi `nghi_khong_luong` — cái sau là ngày lẽ ra phải đi làm mà
   * người ta xin nghỉ. Phải khớp union bên
   * `be/apps/config-service/src/bang-cong/cham-cong-ky-hieu.ts`.
   */
  nhom:
    | 'lam_viec'
    | 'nghi_huong_luong'
    | 'nghi_khong_luong'
    | 'om_bhxh'
    | 'ngay_nghi';
}

export interface Timesheet {
  _id: string;
  thang: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  chiTietNgay: ChiTietNgay[];
  soNgayCong?: number;
  soNgayNghiPhep?: number;
  soNgayNghiKhongLuong?: number;
  soNgayOm?: number;
  soGioLamThem?: number;
  soLanDiMuon?: number;
  soLanVeSom?: number;
  ghiChu?: string;
  trangThai: TimesheetStatus;
  isActive: boolean;
  soOTrong?: number;
  soOCanhBao?: number;
}

/** Tóm tắt trả về từ POST /generate — không còn là mảng Timesheet, phải nạp lại danh sách riêng. */
export interface TomTatTongHop {
  soDongXuLy: number;
  soODaDien: number;
  soOTrong: number;
  soOCanhBao: number;
  soDongBoQuaVIChot: number;
  // Số dòng "mồ côi" (NV không còn hoạt động) đã được dọn về 0 ô trống —
  // xem doc-comment cùng tên ở BE bang-cong.service.ts.
  soDongMoCoi: number;
}

export interface TimesheetFilter {
  thang: string;
  employeeId?: string;
  trangThai?: string;
}

// soLanDiMuon/soLanVeSom KHÔNG có ở đây (spec §5.3, Finding E review wave 2):
// đã chuyển từ nhập tay sang máy tự tính (đếm bản ghi có soPhutDiMuon/
// soPhutVeSom > 0 trong tháng lúc Tổng hợp) — BE (`UpdateTimesheetDto`)
// không còn nhận hai trường này, gửi lên sẽ bị 400.
export interface UpdateTimesheetDto {
  soNgayCong?: number;
  soGioLamThem?: number;
  ghiChu?: string;
}

export interface SetDayDto {
  ngay: number;
  kyHieu: string;
  // Khi bật, kyHieu bị BE bỏ qua và ô được trả về cho máy quản (nguon = 'tu_dong').
  veTuDong?: boolean;
}

class TimesheetService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/bang-cong' });
  }

  async getList(params: TimesheetFilter): Promise<Timesheet[]> {
    const res = await super.get<Array<Record<string, unknown>>>({ params });
    return res.map(this.transform);
  }

  /** POST /generate — giờ trả tóm tắt, KHÔNG còn là danh sách; gọi getList riêng để nạp lưới. */
  async generate(thang: string): Promise<TomTatTongHop> {
    return this.post<TomTatTongHop>({ thang }, { endpoint: '/generate' });
  }

  /** POST /mo-lai — mở lại bảng công đã chốt để sửa tiếp. */
  async moLai(thang: string): Promise<{ soDong: number }> {
    return this.post<{ soDong: number }>({ thang }, { endpoint: '/mo-lai' });
  }

  async update(id: string, dto: UpdateTimesheetDto): Promise<Timesheet> {
    const res = await this.put<Record<string, unknown>>(dto, {
      endpoint: `/${id}`,
    });
    return this.transform(res);
  }

  /** PATCH /:id/ngay — set (hoặc xoá, khi kyHieu = '') ký hiệu của một ngày. */
  async setDay(id: string, dto: SetDayDto): Promise<Timesheet> {
    const res = await this.patch<Record<string, unknown>>(dto, {
      endpoint: `/${id}/ngay`,
    });
    return this.transform(res);
  }

  /** GET /ky-hieu — danh mục ký hiệu chấm công (dùng làm chú thích). */
  async getKyHieu(): Promise<KyHieuDef[]> {
    return this.get<KyHieuDef[]>({ endpoint: '/ky-hieu' });
  }

  async finalize(thang: string): Promise<Timesheet[]> {
    const res = await this.post<Array<Record<string, unknown>>>(
      { thang },
      { endpoint: '/finalize' }
    );
    return res.map(this.transform);
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  private transform(x: Record<string, unknown>): Timesheet {
    return {
      _id: (x._id as string) || (x.id as string),
      thang: x.thang as string,
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      chiTietNgay: Array.isArray(x.chiTietNgay)
        ? (x.chiTietNgay as ChiTietNgay[])
        : [],
      soNgayCong: (x.soNgayCong as number) ?? 0,
      soNgayNghiPhep: (x.soNgayNghiPhep as number) ?? 0,
      soNgayNghiKhongLuong: (x.soNgayNghiKhongLuong as number) ?? 0,
      soNgayOm: (x.soNgayOm as number) ?? 0,
      soGioLamThem: (x.soGioLamThem as number) ?? 0,
      soLanDiMuon: (x.soLanDiMuon as number) ?? 0,
      soLanVeSom: (x.soLanVeSom as number) ?? 0,
      ghiChu: x.ghiChu as string | undefined,
      trangThai: (x.trangThai as TimesheetStatus) ?? 'nhap',
      isActive: (x.isActive as boolean) ?? true,
      soOTrong: x.soOTrong as number | undefined,
      soOCanhBao: x.soOCanhBao as number | undefined,
    };
  }
}

export const timesheetService = new TimesheetService();
