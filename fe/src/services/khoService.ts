import { Kho } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface KhoResponse extends Omit<Kho, 'id'> {
  _id?: string;
  id?: string;
}

class KhoService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/kho' });
  }

  private mapKho(item: KhoResponse): Kho {
    return {
      ...item,
      id: item._id || item.id || '',
    } as Kho;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<Kho>> {
    const response = await this.get<{ data: KhoResponse[]; meta: PaginatedResponse<Kho>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapKho(item)),
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

  async getAll(): Promise<Kho[]> {
    const data = await this.get<KhoResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapKho(item));
  }

  async getById(id: string): Promise<Kho> {
    const data = await this.get<KhoResponse>({ endpoint: `/${id}` });
    return this.mapKho(data);
  }

  async create(data: Omit<Kho, 'id'>): Promise<Kho> {
    const result = await this.post<KhoResponse>(data);
    return this.mapKho(result);
  }

  async update(id: string, data: Partial<Kho>): Promise<Kho> {
    const result = await this.put<KhoResponse>(data, { endpoint: `/${id}` });
    return this.mapKho(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<Kho[]> {
    const data = await this.get<KhoResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapKho(item));
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  async getStats(): Promise<KhoStats> {
    return this.get<KhoStats>({ endpoint: '/stats' });
  }
}

export interface KhoStats {
  tong: number;
}

export const khoService = new KhoService();
