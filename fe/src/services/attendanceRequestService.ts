import { ServiceBase } from './base/service-base';

export type AttendanceRequestType = 'giai_trinh' | 'lam_them_gio';
export type AttendanceRequestStatus = 'cho_duyet' | 'da_duyet' | 'tu_choi';

export interface AttendanceRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  loaiDon: AttendanceRequestType;
  ngay: string;
  lyDo?: string;
  gioTu?: string;
  gioDen?: string;
  minhChung?: string;
  trangThai: AttendanceRequestStatus;
  nguoiDuyet?: string;
  ghiChu?: string;
  isActive: boolean;
}

export interface AttendanceRequestFilter {
  employeeId?: string;
  loaiDon?: string;
  trangThai?: string;
  isActive?: boolean | string;
}

export interface CreateAttendanceRequestDto {
  employeeId: string;
  loaiDon: AttendanceRequestType;
  ngay: string;
  lyDo?: string;
  gioTu?: string;
  gioDen?: string;
  minhChung?: string;
  trangThai?: AttendanceRequestStatus;
  nguoiDuyet?: string;
  ghiChu?: string;
}

export type UpdateAttendanceRequestDto = Partial<CreateAttendanceRequestDto>;

class AttendanceRequestService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/don-cham-cong' });
  }

  async getList(filter?: AttendanceRequestFilter): Promise<AttendanceRequest[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async get(id: string): Promise<AttendanceRequest> {
    const res = await super.get<Record<string, unknown>>({ endpoint: `/${id}` });
    return this.transform(res);
  }

  async create(dto: CreateAttendanceRequestDto): Promise<AttendanceRequest> {
    const res = await this.post<Record<string, unknown>>(dto, {});
    return this.transform(res);
  }

  async update(
    id: string,
    dto: UpdateAttendanceRequestDto
  ): Promise<AttendanceRequest> {
    const res = await this.put<Record<string, unknown>>(dto, { endpoint: `/${id}` });
    return this.transform(res);
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  async updateStatus(
    id: string,
    trangThai: AttendanceRequestStatus,
    nguoiDuyet?: string
  ): Promise<AttendanceRequest> {
    const res = await this.patch<Record<string, unknown>>(
      { trangThai, nguoiDuyet },
      { endpoint: `/${id}/trang-thai` }
    );
    return this.transform(res);
  }

  private transform(x: Record<string, unknown>): AttendanceRequest {
    return {
      id: (x._id as string) || (x.id as string),
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      loaiDon: (x.loaiDon as AttendanceRequestType) ?? 'giai_trinh',
      ngay: x.ngay as string,
      lyDo: x.lyDo as string | undefined,
      gioTu: x.gioTu as string | undefined,
      gioDen: x.gioDen as string | undefined,
      minhChung: x.minhChung as string | undefined,
      trangThai: (x.trangThai as AttendanceRequestStatus) ?? 'cho_duyet',
      nguoiDuyet: x.nguoiDuyet as string | undefined,
      ghiChu: x.ghiChu as string | undefined,
      isActive: (x.isActive as boolean) ?? true,
    };
  }
}

export const attendanceRequestService = new AttendanceRequestService();
