import { NhomKhuyenMai } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface NhomKhuyenMaiResponse extends Omit<NhomKhuyenMai, 'id'> {
  _id?: string;
  id?: string;
}

class NhomKhuyenMaiService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/nhom-khuyen-mai' });
  }

  private mapNhomKhuyenMai(item: NhomKhuyenMaiResponse): NhomKhuyenMai {
    return {
      ...item,
      id: item._id || item.id || '',
    } as NhomKhuyenMai;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<NhomKhuyenMai>> {
    const response = await this.get<{ data: NhomKhuyenMaiResponse[]; meta: PaginatedResponse<NhomKhuyenMai>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapNhomKhuyenMai(item)),
      meta: response.meta,
    };
  }

  async getAll(): Promise<NhomKhuyenMai[]> {
    const data = await this.get<NhomKhuyenMaiResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapNhomKhuyenMai(item));
  }

  async getById(id: string): Promise<NhomKhuyenMai> {
    const data = await this.get<NhomKhuyenMaiResponse>({ endpoint: `/${id}` });
    return this.mapNhomKhuyenMai(data);
  }

  async create(data: Omit<NhomKhuyenMai, 'id'>): Promise<NhomKhuyenMai> {
    const result = await this.post<NhomKhuyenMaiResponse>(data);
    return this.mapNhomKhuyenMai(result);
  }

  async update(id: string, data: Partial<NhomKhuyenMai>): Promise<NhomKhuyenMai> {
    const result = await this.put<NhomKhuyenMaiResponse>(data, { endpoint: `/${id}` });
    return this.mapNhomKhuyenMai(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string, limit = 20): Promise<NhomKhuyenMai[]> {
    const data = await this.get<NhomKhuyenMaiResponse[]>({
      endpoint: '/search',
      params: { keyword, limit: String(limit) },
    });
    return data.map((item) => this.mapNhomKhuyenMai(item));
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  async getStats(): Promise<{ total: number }> {
    return this.get<{ total: number }>({ endpoint: '/stats' });
  }
}

export const nhomKhuyenMaiService = new NhomKhuyenMaiService();
