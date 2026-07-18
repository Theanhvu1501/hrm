import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';
import { HoSoChungTu } from '@/types';

interface HoSoChungTuResponse extends Omit<HoSoChungTu, 'id'> {
  _id?: string;
  id?: string;
}

class HoSoChungTuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/ho-so-chung-tu' });
  }

  private mapItem(item: HoSoChungTuResponse): HoSoChungTu {
    return {
      ...item,
      id: item._id || item.id || '',
    } as HoSoChungTu;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<HoSoChungTu>> {
    const response = await this.get<{ data: HoSoChungTuResponse[]; meta: PaginatedResponse<HoSoChungTu>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapItem(item)),
      meta: response.meta,
    };
  }

  async getAll(): Promise<HoSoChungTu[]> {
    const data = await this.get<HoSoChungTuResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapItem(item));
  }

  async getById(id: string): Promise<HoSoChungTu> {
    const data = await this.get<HoSoChungTuResponse>({ endpoint: `/${id}` });
    return this.mapItem(data);
  }

  async create(data: Omit<HoSoChungTu, 'id'>): Promise<HoSoChungTu> {
    const result = await this.post<HoSoChungTuResponse>(data);
    return this.mapItem(result);
  }

  async update(id: string, data: Partial<HoSoChungTu>): Promise<HoSoChungTu> {
    const result = await this.put<HoSoChungTuResponse>(data, { endpoint: `/${id}` });
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

export const hoSoChungTuService = new HoSoChungTuService();
