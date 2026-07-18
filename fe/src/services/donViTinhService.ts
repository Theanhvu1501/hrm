import { DonViTinh } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface DonViTinhResponse extends Omit<DonViTinh, 'id'> {
  _id?: string;
  id?: string;
}

class DonViTinhService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/don-vi-tinh' });
  }

  private mapDonViTinh(item: DonViTinhResponse): DonViTinh {
    return {
      ...item,
      id: item._id || item.id || '',
    } as DonViTinh;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<DonViTinh>> {
    const response = await this.get<{ data: DonViTinhResponse[]; meta: PaginatedResponse<DonViTinh>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapDonViTinh(item)),
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

  async getAll(): Promise<DonViTinh[]> {
    const data = await this.get<DonViTinhResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapDonViTinh(item));
  }

  async getById(id: string): Promise<DonViTinh> {
    const data = await this.get<DonViTinhResponse>({ endpoint: `/${id}` });
    return this.mapDonViTinh(data);
  }

  async create(data: Omit<DonViTinh, 'id'>): Promise<DonViTinh> {
    const result = await this.post<DonViTinhResponse>(data);
    return this.mapDonViTinh(result);
  }

  async update(id: string, data: Partial<DonViTinh>): Promise<DonViTinh> {
    const result = await this.put<DonViTinhResponse>(data, { endpoint: `/${id}` });
    return this.mapDonViTinh(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<DonViTinh[]> {
    const data = await this.get<DonViTinhResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapDonViTinh(item));
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  async getStats(): Promise<DonViTinhStats> {
    return this.get<DonViTinhStats>({ endpoint: '/stats' });
  }
}

export interface DonViTinhStats {
  tong: number;
}

export const donViTinhService = new DonViTinhService();
