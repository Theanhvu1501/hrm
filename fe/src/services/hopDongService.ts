import { HopDong } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface HopDongResponse extends Omit<HopDong, 'id'> {
  _id?: string;
  id?: string;
}

export interface HopDongStats {
  total: number;
  hdGoc: number;
  hdPhotoScan: number;
  chuaCoHd: number;
}

class HopDongService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/hop-dong' });
  }

  private mapHopDong(item: HopDongResponse): HopDong {
    return {
      ...item,
      id: item._id || item.id || '',
    } as HopDong;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<HopDong>> {
    const response = await this.get<{ data: HopDongResponse[]; meta: PaginatedResponse<HopDong>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapHopDong(item)),
      meta: response.meta,
    };
  }

  async getAll(): Promise<HopDong[]> {
    const data = await this.get<HopDongResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapHopDong(item));
  }

  async getById(id: string): Promise<HopDong> {
    const data = await this.get<HopDongResponse>({ endpoint: `/${id}` });
    return this.mapHopDong(data);
  }

  async create(data: Omit<HopDong, 'id'>): Promise<HopDong> {
    const result = await this.post<HopDongResponse>(data);
    return this.mapHopDong(result);
  }

  async update(id: string, data: Partial<HopDong>): Promise<HopDong> {
    const result = await this.put<HopDongResponse>(data, { endpoint: `/${id}` });
    return this.mapHopDong(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string, limit = 20): Promise<HopDong[]> {
    const data = await this.get<HopDongResponse[]>({
      endpoint: '/search',
      params: { keyword, limit: String(limit) },
    });
    return data.map((item) => this.mapHopDong(item));
  }

  async getStats(): Promise<HopDongStats> {
    return this.get<HopDongStats>({ endpoint: '/stats' });
  }
}

export const hopDongService = new HopDongService();
