import { ServiceBase } from './base/service-base';

export interface ChecklistBanGiaoItem {
  noiDung: string;
  hoanThanh: boolean;
}

export interface Resignation {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  ngayNopDon: string;
  ngayLamViecCuoi?: string;
  loaiThoiViec: string; // tu_nguyen|ky_luat|het_han_hd|khac
  lyDo?: string;
  viPham?: string;
  checklistBanGiao?: ChecklistBanGiaoItem[];
  trangThai: string; // cho_duyet|da_duyet|hoan_thanh|tu_choi
  soQuyetDinh?: string;
  ghiChu?: string;
  isActive: boolean;
}

export interface ResignationFilter {
  employeeId?: string;
  loaiThoiViec?: string;
  trangThai?: string;
  isActive?: boolean | string;
}

export interface CreateResignationDto {
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  ngayNopDon: string;
  ngayLamViecCuoi?: string;
  loaiThoiViec: string;
  lyDo?: string;
  viPham?: string;
  checklistBanGiao?: ChecklistBanGiaoItem[];
  soQuyetDinh?: string;
  ghiChu?: string;
}

export type UpdateResignationDto = Partial<CreateResignationDto>;

class ResignationService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/thoi-viec' });
  }

  async getList(filter?: ResignationFilter): Promise<Resignation[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async get(id: string): Promise<Resignation> {
    const res = await super.get<Record<string, unknown>>({ endpoint: `/${id}` });
    return this.transform(res);
  }

  async create(dto: CreateResignationDto): Promise<Resignation> {
    const res = await this.post<Record<string, unknown>>(dto, {});
    return this.transform(res);
  }

  async update(id: string, dto: UpdateResignationDto): Promise<Resignation> {
    const res = await this.put<Record<string, unknown>>(dto, { endpoint: `/${id}` });
    return this.transform(res);
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  async updateStatus(id: string, trangThai: string): Promise<Resignation> {
    const res = await this.patch<Record<string, unknown>>(
      { trangThai },
      { endpoint: `/${id}/trang-thai` },
    );
    return this.transform(res);
  }

  private transform(x: Record<string, unknown>): Resignation {
    return {
      id: (x._id as string) || (x.id as string),
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      ngayNopDon: x.ngayNopDon as string,
      ngayLamViecCuoi: x.ngayLamViecCuoi as string | undefined,
      loaiThoiViec: x.loaiThoiViec as string,
      lyDo: x.lyDo as string | undefined,
      viPham: x.viPham as string | undefined,
      checklistBanGiao: x.checklistBanGiao as ChecklistBanGiaoItem[] | undefined,
      trangThai: (x.trangThai as string) ?? 'cho_duyet',
      soQuyetDinh: x.soQuyetDinh as string | undefined,
      ghiChu: x.ghiChu as string | undefined,
      isActive: (x.isActive as boolean) ?? true,
    };
  }
}

export const resignationService = new ResignationService();
