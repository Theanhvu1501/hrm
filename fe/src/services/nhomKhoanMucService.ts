import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

export interface NhomKhoanMuc {
  id: string;
  ma: string;
  ten: string;
  loai: 'CHI_PHI' | 'DOANH_THU';
  moTa?: string;
  isActive: boolean;
}

interface NhomKhoanMucResponse extends Omit<NhomKhoanMuc, 'id'> {
  _id?: string;
  id?: string;
}

export interface NhomKhoanMucStats {
  tongNhomKhoanMuc: number;
  chiPhi: number;
  doanhThu: number;
}

export interface NhomKhoanMucPaginationParams extends PaginationParams {
  loai?: 'CHI_PHI' | 'DOANH_THU';
}

class NhomKhoanMucService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/nhom-khoan-muc' });
  }

  private mapNhomKhoanMuc(item: NhomKhoanMucResponse): NhomKhoanMuc {
    return {
      ...item,
      id: item._id || item.id || '',
    } as NhomKhoanMuc;
  }

  async getPaginated(params: NhomKhoanMucPaginationParams = {}): Promise<PaginatedResponse<NhomKhoanMuc>> {
    const response = await this.get<{ data: NhomKhoanMucResponse[]; meta: PaginatedResponse<NhomKhoanMuc>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search, loai: params.loai },
    });
    return {
      data: response.data.map((item) => this.mapNhomKhoanMuc(item)),
      meta: response.meta,
    };
  }

  async getAll(loai?: 'CHI_PHI' | 'DOANH_THU'): Promise<NhomKhoanMuc[]> {
    const data = await this.get<NhomKhoanMucResponse[]>({ endpoint: '/all', params: loai ? { loai } : undefined });
    return data.map((item) => this.mapNhomKhoanMuc(item));
  }

  async getById(id: string): Promise<NhomKhoanMuc> {
    const data = await this.get<NhomKhoanMucResponse>({ endpoint: `/${id}` });
    return this.mapNhomKhoanMuc(data);
  }

  async create(data: Omit<NhomKhoanMuc, 'id' | 'isActive'>): Promise<NhomKhoanMuc> {
    const result = await this.post<NhomKhoanMucResponse>(data);
    return this.mapNhomKhoanMuc(result);
  }

  async update(id: string, data: Partial<NhomKhoanMuc>): Promise<NhomKhoanMuc> {
    const result = await this.put<NhomKhoanMucResponse>(data, { endpoint: `/${id}` });
    return this.mapNhomKhoanMuc(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async getStats(): Promise<NhomKhoanMucStats> {
    return this.get<NhomKhoanMucStats>({ endpoint: '/stats' });
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: excludeId ? { ma, excludeId } : { ma },
    });
    return result.exists;
  }
}

export const nhomKhoanMucService = new NhomKhoanMucService();
