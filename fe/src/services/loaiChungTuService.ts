import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

export type PhanLoaiChungTu = 'THU' | 'CHI' | 'KHAC';

export interface LoaiChungTuType {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
  // THU -> Phiếu thu, CHI -> Phiếu chi, KHAC -> Nhật ký chung
  phanLoai?: PhanLoaiChungTu;
}

interface LoaiChungTuResponse extends Omit<LoaiChungTuType, 'id'> {
  _id?: string;
  id?: string;
}

class LoaiChungTuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/loai-chung-tu' });
  }

  private mapItem(item: LoaiChungTuResponse): LoaiChungTuType {
    return {
      ...item,
      id: item._id || item.id || '',
    } as LoaiChungTuType;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<LoaiChungTuType>> {
    const response = await this.get<{ data: LoaiChungTuResponse[]; meta: PaginatedResponse<LoaiChungTuType>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapItem(item)),
      meta: response.meta,
    };
  }

  async getTotal(search?: string): Promise<number> {
    const result = await this.get<{ total: number }>({
      endpoint: '/total',
      params: { search },
    });
    return result.total;
  }

  async getAll(): Promise<LoaiChungTuType[]> {
    const data = await this.get<LoaiChungTuResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapItem(item));
  }

  async getById(id: string): Promise<LoaiChungTuType> {
    const data = await this.get<LoaiChungTuResponse>({ endpoint: `/${id}` });
    return this.mapItem(data);
  }

  async create(data: Omit<LoaiChungTuType, 'id'>): Promise<LoaiChungTuType> {
    const result = await this.post<LoaiChungTuResponse>(data);
    return this.mapItem(result);
  }

  async update(id: string, data: Partial<LoaiChungTuType>): Promise<LoaiChungTuType> {
    const result = await this.put<LoaiChungTuResponse>(data, { endpoint: `/${id}` });
    return this.mapItem(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }
}

export const loaiChungTuService = new LoaiChungTuService();
