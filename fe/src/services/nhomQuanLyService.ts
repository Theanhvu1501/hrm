import { NhomQuanLy } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface NhomQuanLyResponse extends Omit<NhomQuanLy, 'id'> {
  _id?: string;
  id?: string;
}

class NhomQuanLyService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/nhom-quan-ly' });
  }

  private mapNhomQuanLy(item: NhomQuanLyResponse): NhomQuanLy {
    return {
      ...item,
      id: item._id || item.id || '',
    } as NhomQuanLy;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<NhomQuanLy>> {
    const response = await this.get<{ data: NhomQuanLyResponse[]; meta: PaginatedResponse<NhomQuanLy>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapNhomQuanLy(item)),
      meta: response.meta,
    };
  }

  async getAll(): Promise<NhomQuanLy[]> {
    const data = await this.get<NhomQuanLyResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapNhomQuanLy(item));
  }

  async getById(id: string): Promise<NhomQuanLy> {
    const data = await this.get<NhomQuanLyResponse>({ endpoint: `/${id}` });
    return this.mapNhomQuanLy(data);
  }

  async create(data: Omit<NhomQuanLy, 'id'>): Promise<NhomQuanLy> {
    const result = await this.post<NhomQuanLyResponse>(data);
    return this.mapNhomQuanLy(result);
  }

  async update(id: string, data: Partial<NhomQuanLy>): Promise<NhomQuanLy> {
    const result = await this.put<NhomQuanLyResponse>(data, { endpoint: `/${id}` });
    return this.mapNhomQuanLy(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string, limit = 20): Promise<NhomQuanLy[]> {
    const data = await this.get<NhomQuanLyResponse[]>({
      endpoint: '/search',
      params: { keyword, limit: String(limit) },
    });
    return data.map((item) => this.mapNhomQuanLy(item));
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

export const nhomQuanLyService = new NhomQuanLyService();
