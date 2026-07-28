import { ServiceBase } from './base/service-base';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  nam: number;
  loaiQuy: string;
  soNgayDuocCap: number;
  soNgayDaDung: number;
  soNgayDangChoDuyet: number;
  soNgayConLai: number;
  hanDung: string;
  trangThai: string; // dang_hieu_luc|da_dong
  ghiChu?: string;
}

export interface LeaveBalanceEntry {
  id: string;
  balanceId: string;
  nam: number;
  soNgay: number;
  lyDo: string;
  requestId?: string;
  nguoiThucHien?: string;
  thoiDiem: string;
  ghiChu?: string;
}

export interface DongXemTruocCap {
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  nam: number;
  soNgay: number;
  daCoQuy: boolean;
}

export interface DongXemTruocDong {
  balanceId: string;
  employeeName?: string;
  employeeCode?: string;
  soNgayMat: number;
}

/**
 * DTO điều chỉnh tay một quỹ phép. `employeeId` là bắt buộc (không chỉ
 * `balanceId`) vì BE đối chiếu chéo nó với chủ sở hữu thật của quỹ và trả 403
 * nếu lệch — chặn trường hợp FE gửi nhầm `balanceId` của người khác.
 */
export interface DieuChinhQuyPhepDto {
  employeeId: string;
  balanceId: string;
  soNgay: number;
  ghiChu: string;
}

class LeaveBalanceService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/quy-phep' });
  }

  async getList(employeeId?: string): Promise<LeaveBalance[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: employeeId ? { employeeId } : undefined,
    });
    return res.map(this.transform);
  }

  async getCuaToi(): Promise<LeaveBalance[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      endpoint: '/cua-toi',
    });
    return res.map(this.transform);
  }

  async getSoBienDong(balanceId: string): Promise<LeaveBalanceEntry[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      endpoint: `/${balanceId}/so-bien-dong`,
    });
    return res.map((x) => ({
      id: (x._id as string) || (x.id as string),
      balanceId: x.balanceId as string,
      nam: (x.nam as number) ?? 0,
      soNgay: (x.soNgay as number) ?? 0,
      lyDo: x.lyDo as string,
      requestId: x.requestId as string | undefined,
      nguoiThucHien: x.nguoiThucHien as string | undefined,
      thoiDiem: x.thoiDiem as string,
      ghiChu: x.ghiChu as string | undefined,
    }));
  }

  async doiSoat(employeeId?: string): Promise<Array<Record<string, unknown>>> {
    return super.get<Array<Record<string, unknown>>>({
      endpoint: '/doi-soat',
      params: employeeId ? { employeeId } : undefined,
    });
  }

  async capDauNam(nam: number, xemTruoc = false) {
    return this.post<DongXemTruocCap[] | { daCap: number; boQua: number }>(
      { nam, xemTruoc },
      { endpoint: '/cap-dau-nam' },
    );
  }

  async dongQuy(nam: number, xemTruoc = false) {
    return this.post<DongXemTruocDong[] | { soQuyDaDong: number; tongNgayMat: number }>(
      { nam, xemTruoc },
      { endpoint: '/dong-quy' },
    );
  }

  async dieuChinh(dto: DieuChinhQuyPhepDto) {
    return this.post<Record<string, unknown>>(dto, { endpoint: '/dieu-chinh' });
  }

  private transform(x: Record<string, unknown>): LeaveBalance {
    return {
      id: (x._id as string) || (x.id as string),
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      nam: (x.nam as number) ?? 0,
      loaiQuy: (x.loaiQuy as string) ?? 'phep_nam',
      // `??` chứ không `||`: 0 là số dư hợp lệ.
      soNgayDuocCap: (x.soNgayDuocCap as number) ?? 0,
      soNgayDaDung: (x.soNgayDaDung as number) ?? 0,
      soNgayDangChoDuyet: (x.soNgayDangChoDuyet as number) ?? 0,
      soNgayConLai: (x.soNgayConLai as number) ?? 0,
      hanDung: x.hanDung as string,
      trangThai: (x.trangThai as string) ?? 'dang_hieu_luc',
      ghiChu: x.ghiChu as string | undefined,
    };
  }
}

export const leaveBalanceService = new LeaveBalanceService();
