import { ServiceBase } from './base/service-base';

export interface WorkShift {
  id: string;
  ten: string;
  gioBatDau: string;
  gioKetThuc: string;
  gioNghiTu?: string;
  gioNghiDen?: string;
  laCaQuaDem: boolean;
  laLinhHoat: boolean;
  soPhutLinhHoat?: number;
  moTa?: string;
  isActive: boolean;
}

export interface WorkShiftFilter {
  isActive?: boolean | string;
}

export interface CreateWorkShiftDto {
  ten: string;
  gioBatDau: string;
  gioKetThuc: string;
  gioNghiTu?: string;
  gioNghiDen?: string;
  laLinhHoat?: boolean;
  soPhutLinhHoat?: number;
  moTa?: string;
  isActive?: boolean;
}

export type UpdateWorkShiftDto = Partial<CreateWorkShiftDto>;

class WorkShiftService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/ca-lam-viec' });
  }

  async getList(filter?: WorkShiftFilter): Promise<WorkShift[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async get(id: string): Promise<WorkShift> {
    const res = await super.get<Record<string, unknown>>({ endpoint: `/${id}` });
    return this.transform(res);
  }

  async create(dto: CreateWorkShiftDto): Promise<WorkShift> {
    const res = await this.post<Record<string, unknown>>(dto, {});
    return this.transform(res);
  }

  async update(id: string, dto: UpdateWorkShiftDto): Promise<WorkShift> {
    const res = await this.put<Record<string, unknown>>(dto, { endpoint: `/${id}` });
    return this.transform(res);
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  private transform(x: Record<string, unknown>): WorkShift {
    return {
      id: (x._id as string) || (x.id as string),
      ten: x.ten as string,
      gioBatDau: x.gioBatDau as string,
      gioKetThuc: x.gioKetThuc as string,
      gioNghiTu: x.gioNghiTu as string | undefined,
      gioNghiDen: x.gioNghiDen as string | undefined,
      laCaQuaDem: (x.laCaQuaDem as boolean) ?? false,
      laLinhHoat: (x.laLinhHoat as boolean) ?? false,
      soPhutLinhHoat: x.soPhutLinhHoat as number | undefined,
      moTa: x.moTa as string | undefined,
      isActive: (x.isActive as boolean) ?? true,
    };
  }
}

export const workShiftService = new WorkShiftService();
