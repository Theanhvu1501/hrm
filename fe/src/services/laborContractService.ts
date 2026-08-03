import { ServiceBase } from './base/service-base';

export interface LaborContract {
  id: string;
  contractNo: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  /** Chức danh TẠI THỜI ĐIỂM KÝ — snapshot, không đổi theo hồ sơ nhân viên sau này (xem BE labor-contract.entity.ts). */
  chucDanh?: string;
  loaiHopDong: string;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  mucLuong?: number;
  phuCap?: number;
  hinhThucTraLuong?: string;
  trangThai: string;
  ghiChu?: string;
  fileUrl?: string;
  isActive: boolean;
}

export interface LaborContractFilter {
  employeeId?: string;
  loaiHopDong?: string;
  trangThai?: string;
  isActive?: boolean | string;
}

export interface CreateLaborContractDto {
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  chucDanh?: string;
  loaiHopDong: string;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  mucLuong?: number;
  phuCap?: number;
  hinhThucTraLuong?: string;
  trangThai?: string;
  ghiChu?: string;
  fileUrl?: string;
}

export type UpdateLaborContractDto = Partial<CreateLaborContractDto>;

class LaborContractService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/hop-dong' });
  }

  async getList(filter?: LaborContractFilter): Promise<LaborContract[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async get(id: string): Promise<LaborContract> {
    const res = await super.get<Record<string, unknown>>({ endpoint: `/${id}` });
    return this.transform(res);
  }

  async create(dto: CreateLaborContractDto): Promise<LaborContract> {
    const res = await this.post<Record<string, unknown>>(dto, {});
    return this.transform(res);
  }

  async update(id: string, dto: UpdateLaborContractDto): Promise<LaborContract> {
    const res = await this.put<Record<string, unknown>>(dto, { endpoint: `/${id}` });
    return this.transform(res);
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  async updateStatus(id: string, trangThai: string): Promise<LaborContract> {
    const res = await this.patch<Record<string, unknown>>(
      { trangThai },
      { endpoint: `/${id}/trang-thai` },
    );
    return this.transform(res);
  }

  private transform(x: Record<string, unknown>): LaborContract {
    return {
      id: (x._id as string) || (x.id as string),
      contractNo: x.contractNo as string,
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      chucDanh: x.chucDanh as string | undefined,
      loaiHopDong: x.loaiHopDong as string,
      ngayBatDau: x.ngayBatDau as string | undefined,
      ngayKetThuc: x.ngayKetThuc as string | undefined,
      mucLuong: x.mucLuong as number | undefined,
      phuCap: x.phuCap as number | undefined,
      hinhThucTraLuong: x.hinhThucTraLuong as string | undefined,
      trangThai: (x.trangThai as string) ?? 'du_thao',
      ghiChu: x.ghiChu as string | undefined,
      fileUrl: x.fileUrl as string | undefined,
      isActive: (x.isActive as boolean) ?? true,
    };
  }
}

export const laborContractService = new LaborContractService();
