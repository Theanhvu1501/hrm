import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

export interface LyDoKhongHopLe {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
  isActive?: boolean;
}

interface LyDoKhongHopLeResponse extends Omit<LyDoKhongHopLe, 'id'> {
  _id?: string;
  id?: string;
}

class LyDoKhongHopLeService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/ly-do-khong-hop-le' });
  }

  private mapLyDoKhongHopLe(item: LyDoKhongHopLeResponse): LyDoKhongHopLe {
    return {
      ...item,
      id: item._id || item.id || '',
    } as LyDoKhongHopLe;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<LyDoKhongHopLe>> {
    const response = await this.get<{ data: LyDoKhongHopLeResponse[]; meta: PaginatedResponse<LyDoKhongHopLe>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapLyDoKhongHopLe(item)),
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

  async getAll(): Promise<LyDoKhongHopLe[]> {
    const data = await this.get<LyDoKhongHopLeResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapLyDoKhongHopLe(item));
  }

  async getById(id: string): Promise<LyDoKhongHopLe> {
    const data = await this.get<LyDoKhongHopLeResponse>({ endpoint: `/${id}` });
    return this.mapLyDoKhongHopLe(data);
  }

  async create(data: Omit<LyDoKhongHopLe, 'id'>): Promise<LyDoKhongHopLe> {
    const result = await this.post<LyDoKhongHopLeResponse>(data);
    return this.mapLyDoKhongHopLe(result);
  }

  async update(id: string, data: Partial<LyDoKhongHopLe>): Promise<LyDoKhongHopLe> {
    const result = await this.put<LyDoKhongHopLeResponse>(data, { endpoint: `/${id}` });
    return this.mapLyDoKhongHopLe(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<LyDoKhongHopLe[]> {
    const data = await this.get<LyDoKhongHopLeResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapLyDoKhongHopLe(item));
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  async getStats(): Promise<LyDoKhongHopLeStats> {
    return this.get<LyDoKhongHopLeStats>({ endpoint: '/stats' });
  }
}

export interface LyDoKhongHopLeStats {
  tong: number;
}

export const lyDoKhongHopLeService = new LyDoKhongHopLeService();
