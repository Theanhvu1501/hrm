import { ServiceBase } from './base/service-base';

export type AttendanceLocationType = 'gps' | 'wifi' | 'qr';

export interface AttendanceLocation {
  id: string;
  ten: string;
  loai: AttendanceLocationType;
  latitude?: number;
  longitude?: number;
  banKinh?: number;
  ipWifi?: string;
  maQr?: string;
  diaChi?: string;
  chiNhanh?: string;
  phongBan?: string;
  isActive: boolean;
}

export interface AttendanceLocationFilter {
  isActive?: boolean | string;
}

export interface CreateAttendanceLocationDto {
  ten: string;
  loai: AttendanceLocationType;
  latitude?: number;
  longitude?: number;
  banKinh?: number;
  ipWifi?: string;
  maQr?: string;
  diaChi?: string;
  chiNhanh?: string;
  phongBan?: string;
  isActive?: boolean;
}

export type UpdateAttendanceLocationDto = Partial<CreateAttendanceLocationDto>;

class AttendanceLocationService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/dia-diem-cham-cong' });
  }

  async getList(filter?: AttendanceLocationFilter): Promise<AttendanceLocation[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async get(id: string): Promise<AttendanceLocation> {
    const res = await super.get<Record<string, unknown>>({ endpoint: `/${id}` });
    return this.transform(res);
  }

  async create(dto: CreateAttendanceLocationDto): Promise<AttendanceLocation> {
    const res = await this.post<Record<string, unknown>>(dto, {});
    return this.transform(res);
  }

  async update(
    id: string,
    dto: UpdateAttendanceLocationDto
  ): Promise<AttendanceLocation> {
    const res = await this.put<Record<string, unknown>>(dto, { endpoint: `/${id}` });
    return this.transform(res);
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  private transform(x: Record<string, unknown>): AttendanceLocation {
    return {
      id: (x._id as string) || (x.id as string),
      ten: x.ten as string,
      loai: (x.loai as AttendanceLocationType) ?? 'gps',
      latitude: x.latitude as number | undefined,
      longitude: x.longitude as number | undefined,
      banKinh: x.banKinh as number | undefined,
      ipWifi: x.ipWifi as string | undefined,
      maQr: x.maQr as string | undefined,
      diaChi: x.diaChi as string | undefined,
      chiNhanh: x.chiNhanh as string | undefined,
      phongBan: x.phongBan as string | undefined,
      isActive: (x.isActive as boolean) ?? true,
    };
  }
}

export const attendanceLocationService = new AttendanceLocationService();
