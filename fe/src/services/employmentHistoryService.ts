import { ServiceBase } from './base/service-base';

export interface EmploymentHistory {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  loaiThayDoi: string;
  ngayHieuLuc: string;
  phongBanCu?: string;
  phongBanMoi?: string;
  chucDanhCu?: string;
  chucDanhMoi?: string;
  trangThaiCu?: string;
  trangThaiMoi?: string;
  mucLuongCu?: number;
  mucLuongMoi?: number;
  soQuyetDinh?: string;
  lyDo?: string;
  ghiChu?: string;
  isActive: boolean;
}

export interface EmploymentHistoryFilter {
  employeeId?: string;
  loaiThayDoi?: string;
  isActive?: boolean | string;
}

export interface CreateEmploymentHistoryDto {
  employeeId: string;
  loaiThayDoi: string;
  ngayHieuLuc: string;
  /** id phòng ban mới trong danh mục identity. Lịch sử (`phongBanCu`/
   *  `phongBanMoi` trên `EmploymentHistory`) vẫn lưu TÊN, không lưu id — BE
   *  tự tra tên tại thời điểm ghi nhận (xem `qua-trinh-cong-tac.service.ts`). */
  departmentIdMoi?: string;
  chucDanhMoi?: string;
  trangThaiMoi?: string;
  mucLuongMoi?: number;
  soQuyetDinh?: string;
  lyDo?: string;
  ghiChu?: string;
}

export type UpdateEmploymentHistoryDto = Partial<CreateEmploymentHistoryDto>;

class EmploymentHistoryService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/qua-trinh-cong-tac' });
  }

  async getList(filter?: EmploymentHistoryFilter): Promise<EmploymentHistory[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async get(id: string): Promise<EmploymentHistory> {
    const res = await super.get<Record<string, unknown>>({ endpoint: `/${id}` });
    return this.transform(res);
  }

  async create(dto: CreateEmploymentHistoryDto): Promise<EmploymentHistory> {
    const res = await this.post<Record<string, unknown>>(dto, {});
    return this.transform(res);
  }

  async update(id: string, dto: UpdateEmploymentHistoryDto): Promise<EmploymentHistory> {
    const res = await this.put<Record<string, unknown>>(dto, { endpoint: `/${id}` });
    return this.transform(res);
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  private transform(x: Record<string, unknown>): EmploymentHistory {
    return {
      id: (x._id as string) || (x.id as string),
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      loaiThayDoi: x.loaiThayDoi as string,
      ngayHieuLuc: x.ngayHieuLuc as string,
      phongBanCu: x.phongBanCu as string | undefined,
      phongBanMoi: x.phongBanMoi as string | undefined,
      chucDanhCu: x.chucDanhCu as string | undefined,
      chucDanhMoi: x.chucDanhMoi as string | undefined,
      trangThaiCu: x.trangThaiCu as string | undefined,
      trangThaiMoi: x.trangThaiMoi as string | undefined,
      mucLuongCu: x.mucLuongCu as number | undefined,
      mucLuongMoi: x.mucLuongMoi as number | undefined,
      soQuyetDinh: x.soQuyetDinh as string | undefined,
      lyDo: x.lyDo as string | undefined,
      ghiChu: x.ghiChu as string | undefined,
      isActive: (x.isActive as boolean) ?? true,
    };
  }
}

export const employmentHistoryService = new EmploymentHistoryService();
