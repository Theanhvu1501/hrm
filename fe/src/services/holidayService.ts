import { ServiceBase } from './base/service-base';

export interface Holiday {
  id: string;
  ten: string;
  tuNgay: string;
  denNgay: string;
  nam: number;
  loai: string;        // le|nghi_cty
  huongLuong: boolean;
  moTa?: string;
  isActive: boolean;
}

export interface HolidayFilter {
  nam?: number | string;
  isActive?: boolean | string;
}

export interface CreateHolidayDto {
  ten: string;
  tuNgay: string;
  denNgay: string;
  loai?: string;
  huongLuong?: boolean;
  moTa?: string;
  isActive?: boolean;
}

export type UpdateHolidayDto = Partial<CreateHolidayDto>;

class HolidayService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/ngay-le' });
  }

  async getList(filter?: HolidayFilter): Promise<Holiday[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async create(dto: CreateHolidayDto): Promise<Holiday> {
    const res = await this.post<Record<string, unknown>>(dto, {});
    return this.transform(res);
  }

  async update(id: string, dto: UpdateHolidayDto): Promise<Holiday> {
    const res = await this.put<Record<string, unknown>>(dto, {
      endpoint: `/${id}`,
    });
    return this.transform(res);
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  private transform(x: Record<string, unknown>): Holiday {
    return {
      id: (x._id as string) || (x.id as string),
      ten: x.ten as string,
      tuNgay: x.tuNgay as string,
      denNgay: x.denNgay as string,
      nam: (x.nam as number) ?? 0,
      loai: (x.loai as string) ?? 'le',
      huongLuong: (x.huongLuong as boolean) ?? true,
      moTa: x.moTa as string | undefined,
      isActive: (x.isActive as boolean) ?? true,
    };
  }
}

export const holidayService = new HolidayService();
