import { ServiceBase } from './base/service-base';

export interface EmployeeDevice {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  deviceId: string;
  tenThietBi?: string;
  userAgent?: string;
  trangThai: string;      // cho_duyet|da_duyet|tu_choi|thu_hoi
  lanDauDangKy?: string;
  lanDuyet?: string;
  nguoiDuyet?: string;
  lyDoThuHoi?: string;
  isActive: boolean;
}

export interface EmployeeDeviceFilter {
  trangThai?: string;
  employeeId?: string;
}

class EmployeeDeviceService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/thiet-bi-cham-cong' });
  }

  async getList(filter?: EmployeeDeviceFilter): Promise<EmployeeDevice[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async cuaToi(): Promise<EmployeeDevice[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      endpoint: '/cua-toi',
    });
    return res.map(this.transform);
  }

  async duyet(id: string): Promise<EmployeeDevice> {
    const res = await this.post<Record<string, unknown>>(
      {},
      { endpoint: `/${id}/duyet` },
    );
    return this.transform(res);
  }

  async tuChoi(id: string): Promise<EmployeeDevice> {
    const res = await this.post<Record<string, unknown>>(
      {},
      { endpoint: `/${id}/tu-choi` },
    );
    return this.transform(res);
  }

  async thuHoi(id: string, lyDo?: string): Promise<EmployeeDevice> {
    const res = await this.post<Record<string, unknown>>(
      { lyDo },
      { endpoint: `/${id}/thu-hoi` },
    );
    return this.transform(res);
  }

  private transform(x: Record<string, unknown>): EmployeeDevice {
    return {
      id: (x._id as string) || (x.id as string),
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      deviceId: x.deviceId as string,
      tenThietBi: x.tenThietBi as string | undefined,
      userAgent: x.userAgent as string | undefined,
      trangThai: (x.trangThai as string) ?? 'cho_duyet',
      lanDauDangKy: x.lanDauDangKy as string | undefined,
      lanDuyet: x.lanDuyet as string | undefined,
      nguoiDuyet: x.nguoiDuyet as string | undefined,
      lyDoThuHoi: x.lyDoThuHoi as string | undefined,
      isActive: (x.isActive as boolean) ?? true,
    };
  }
}

export const employeeDeviceService = new EmployeeDeviceService();
