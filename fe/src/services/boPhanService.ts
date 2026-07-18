import { BoPhan } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface BoPhanResponse extends Omit<BoPhan, 'id'> {
  _id?: string;
  id?: string;
}

export interface BoPhanStats {
  tongBoPhan: number;
}

class BoPhanService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/bo-phan' });
  }

  private mapBoPhan(item: BoPhanResponse): BoPhan {
    return {
      ...item,
      id: item._id || item.id || '',
    } as BoPhan;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<BoPhan>> {
    const response = await this.get<{ data: BoPhanResponse[]; meta: PaginatedResponse<BoPhan>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapBoPhan(item)),
      meta: response.meta,
    };
  }

  /**
   * Get total count from separate API
   */
  async getTotal(search?: string): Promise<number> {
    const result = await this.get<{ total: number }>({
      endpoint: '/total',
      params: { search },
    });
    return result.total;
  }

  /**
   * Get all items without pagination
   */
  async getAll(): Promise<BoPhan[]> {
    const data = await this.get<BoPhanResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapBoPhan(item));
  }

  async getById(id: string): Promise<BoPhan> {
    const data = await this.get<BoPhanResponse>({ endpoint: `/${id}` });
    return this.mapBoPhan(data);
  }

  async create(data: Omit<BoPhan, 'id'>): Promise<BoPhan> {
    const result = await this.post<BoPhanResponse>(data);
    return this.mapBoPhan(result);
  }

  async update(id: string, data: Partial<BoPhan>): Promise<BoPhan> {
    const result = await this.put<BoPhanResponse>(data, { endpoint: `/${id}` });
    return this.mapBoPhan(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<BoPhan[]> {
    return this.get<BoPhan[]>({ endpoint: '/search', params: { keyword } });
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  async getStats(): Promise<BoPhanStats> {
    const result = await this.get<BoPhanStats>({
      endpoint: '/stats',
    });
    return result;
  }
}

export const boPhanService = new BoPhanService();
