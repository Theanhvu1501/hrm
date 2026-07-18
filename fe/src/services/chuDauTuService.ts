import { ChuDauTu } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface ChuDauTuResponse extends Omit<ChuDauTu, 'id'> {
  _id?: string;
  id?: string;
}

class ChuDauTuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/chu-dau-tu' });
  }

  private mapChuDauTu(item: ChuDauTuResponse): ChuDauTu {
    return {
      ...item,
      id: item._id || item.id || '',
    } as ChuDauTu;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<ChuDauTu>> {
    const response = await this.get<{ data: ChuDauTuResponse[]; meta: PaginatedResponse<ChuDauTu>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapChuDauTu(item)),
      meta: response.meta,
    };
  }

  async getAll(): Promise<ChuDauTu[]> {
    const data = await this.get<ChuDauTuResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapChuDauTu(item));
  }

  async getById(id: string): Promise<ChuDauTu> {
    const data = await this.get<ChuDauTuResponse>({ endpoint: `/${id}` });
    return this.mapChuDauTu(data);
  }

  async create(data: Omit<ChuDauTu, 'id'>): Promise<ChuDauTu> {
    const result = await this.post<ChuDauTuResponse>(data);
    return this.mapChuDauTu(result);
  }

  async update(id: string, data: Partial<ChuDauTu>): Promise<ChuDauTu> {
    const result = await this.put<ChuDauTuResponse>(data, { endpoint: `/${id}` });
    return this.mapChuDauTu(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string, limit = 20): Promise<ChuDauTu[]> {
    const data = await this.get<ChuDauTuResponse[]>({
      endpoint: '/search',
      params: { keyword, limit: String(limit) },
    });
    return data.map((item) => this.mapChuDauTu(item));
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

export const chuDauTuService = new ChuDauTuService();
