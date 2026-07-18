import { HangHoaVatTu } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface HangHoaVatTuResponse extends Omit<HangHoaVatTu, 'id'> {
  _id?: string;
  id?: string;
}

class HangHoaVatTuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/hang-hoa-vat-tu' });
  }

  private mapHangHoaVatTu(item: HangHoaVatTuResponse): HangHoaVatTu {
    return {
      ...item,
      id: item._id || item.id || '',
    } as HangHoaVatTu;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<HangHoaVatTu>> {
    const response = await this.get<{ data: HangHoaVatTuResponse[]; meta: PaginatedResponse<HangHoaVatTu>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapHangHoaVatTu(item)),
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

  async getAll(): Promise<HangHoaVatTu[]> {
    const data = await this.get<HangHoaVatTuResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapHangHoaVatTu(item));
  }

  async getById(id: string): Promise<HangHoaVatTu> {
    const data = await this.get<HangHoaVatTuResponse>({ endpoint: `/${id}` });
    return this.mapHangHoaVatTu(data);
  }

  async create(data: Omit<HangHoaVatTu, 'id'>): Promise<HangHoaVatTu> {
    const result = await this.post<HangHoaVatTuResponse>(data);
    return this.mapHangHoaVatTu(result);
  }

  async update(id: string, data: Partial<HangHoaVatTu>): Promise<HangHoaVatTu> {
    const result = await this.put<HangHoaVatTuResponse>(data, { endpoint: `/${id}` });
    return this.mapHangHoaVatTu(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<HangHoaVatTu[]> {
    const data = await this.get<HangHoaVatTuResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapHangHoaVatTu(item));
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  async getStats(): Promise<HangHoaVatTuStats> {
    return this.get<HangHoaVatTuStats>({ endpoint: '/stats' });
  }
}

export interface HangHoaVatTuStats {
  tong: number;
  theoTinhChat?: Record<string, number>;
}

export const hangHoaVatTuService = new HangHoaVatTuService();
