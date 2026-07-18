import { ServiceBase } from './base/service-base';

export type TimesheetStatus = 'nhap' | 'chot';

export interface Timesheet {
  _id: string;
  thang: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  soNgayCong?: number;
  soGioLamThem?: number;
  soLanDiMuon?: number;
  soLanVeSom?: number;
  ghiChu?: string;
  trangThai: TimesheetStatus;
  isActive: boolean;
}

export interface TimesheetFilter {
  thang: string;
  employeeId?: string;
  trangThai?: string;
}

export interface UpdateTimesheetDto {
  soNgayCong?: number;
  soGioLamThem?: number;
  soLanDiMuon?: number;
  soLanVeSom?: number;
  ghiChu?: string;
}

class TimesheetService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/bang-cong' });
  }

  async getList(params: TimesheetFilter): Promise<Timesheet[]> {
    const res = await super.get<Array<Record<string, unknown>>>({ params });
    return res.map(this.transform);
  }

  async generate(thang: string): Promise<Timesheet[]> {
    const res = await this.post<Array<Record<string, unknown>>>(
      { thang },
      { endpoint: '/generate' }
    );
    return res.map(this.transform);
  }

  async update(id: string, dto: UpdateTimesheetDto): Promise<Timesheet> {
    const res = await this.put<Record<string, unknown>>(dto, {
      endpoint: `/${id}`,
    });
    return this.transform(res);
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
      soNgayCong: (x.soNgayCong as number) ?? 0,
      soGioLamThem: (x.soGioLamThem as number) ?? 0,
      soLanDiMuon: (x.soLanDiMuon as number) ?? 0,
      soLanVeSom: (x.soLanVeSom as number) ?? 0,
      ghiChu: x.ghiChu as string | undefined,
      trangThai: (x.trangThai as TimesheetStatus) ?? 'nhap',
      isActive: (x.isActive as boolean) ?? true,
    };
  }
}

export const timesheetService = new TimesheetService();
