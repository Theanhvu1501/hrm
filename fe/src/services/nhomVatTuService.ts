import { NhomVatTu } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface NhomVatTuResponse extends Omit<NhomVatTu, 'id'> {
  _id?: string;
  id?: string;
}

class NhomVatTuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/nhom-vat-tu' });
  }

  private mapNhomVatTu(item: NhomVatTuResponse): NhomVatTu {
    return {
      ...item,
      id: item._id || item.id || '',
    } as NhomVatTu;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<NhomVatTu>> {
    const response = await this.get<{ data: NhomVatTuResponse[]; meta: PaginatedResponse<NhomVatTu>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapNhomVatTu(item)),
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

  async getAll(): Promise<NhomVatTu[]> {
    const data = await this.get<NhomVatTuResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapNhomVatTu(item));
  }

  async getById(id: string): Promise<NhomVatTu> {
    const data = await this.get<NhomVatTuResponse>({ endpoint: `/${id}` });
    return this.mapNhomVatTu(data);
  }

  async create(data: Omit<NhomVatTu, 'id'>): Promise<NhomVatTu> {
    const result = await this.post<NhomVatTuResponse>(data);
    return this.mapNhomVatTu(result);
  }

  async update(id: string, data: Partial<NhomVatTu>): Promise<NhomVatTu> {
    const result = await this.put<NhomVatTuResponse>(data, { endpoint: `/${id}` });
    return this.mapNhomVatTu(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<NhomVatTu[]> {
    const data = await this.get<NhomVatTuResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapNhomVatTu(item));
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  async getStats(): Promise<NhomVatTuStats> {
    return this.get<NhomVatTuStats>({ endpoint: '/stats' });
  }
}

export interface NhomVatTuStats {
  tong: number;
}

export const nhomVatTuService = new NhomVatTuService();
