import { DuAn } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

type DuAnTrangThai = DuAn['trangThai'];

export interface DuAnStats {
  tongDuAn: number;
  dangThucHien: number;
  hoanThanh: number;
  tamDung: number;
}

interface DuAnResponse extends Omit<DuAn, 'id'> {
  _id?: string;
  id?: string;
}

class DuAnService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/du-an' });
  }

  private mapDuAn(item: DuAnResponse): DuAn {
    return {
      ...item,
      id: item._id || item.id || '',
    } as DuAn;
  }

  async getPaginated(params: PaginationParams & { trangThai?: DuAnTrangThai } = {}): Promise<PaginatedResponse<DuAn>> {
    const response = await this.get<{ data: DuAnResponse[]; meta: PaginatedResponse<DuAn>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search, trangThai: params.trangThai },
    });
    return {
      data: response.data.map((item) => this.mapDuAn(item)),
      meta: response.meta,
    };
  }

  /**
   * Get total count from separate API
   */
  async getTotal(params: { search?: string; trangThai?: DuAnTrangThai } = {}): Promise<number> {
    const result = await this.get<{ total: number }>({
      endpoint: '/total',
      params: { search: params.search, trangThai: params.trangThai },
    });
    return result.total;
  }

  /**
   * Get all items without pagination
   */
  async getAll(trangThai?: DuAnTrangThai): Promise<DuAn[]> {
    const params: Record<string, string> = {};
    if (trangThai) params.trangThai = trangThai;
    const data = await this.get<DuAnResponse[]>({ endpoint: '/all', params });
    return data.map((item) => this.mapDuAn(item));
  }

  async getById(id: string): Promise<DuAn> {
    const data = await this.get<DuAnResponse>({ endpoint: `/${id}` });
    return this.mapDuAn(data);
  }

  async create(data: Omit<DuAn, 'id'>): Promise<DuAn> {
    const result = await this.post<DuAnResponse>(data);
    return this.mapDuAn(result);
  }

  async update(id: string, data: Partial<DuAn>): Promise<DuAn> {
    const result = await this.put<DuAnResponse>(data, { endpoint: `/${id}` });
    return this.mapDuAn(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<DuAn[]> {
    const data = await this.get<DuAnResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapDuAn(item));
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  async getStats(): Promise<DuAnStats> {
    return this.get<DuAnStats>({ endpoint: '/stats' });
  }

  async updateStatus(id: string, trangThai: DuAnTrangThai): Promise<DuAn> {
    const result = await this.put<DuAnResponse>({ trangThai }, { endpoint: `/${id}/status` });
    return this.mapDuAn(result);
  }

  /**
   * Alias for updateStatus - used by pages
   */
  async updateTrangThai(id: string, trangThai: DuAnTrangThai): Promise<DuAn> {
    return this.updateStatus(id, trangThai);
  }

  /**
   * Get by trangThai - uses getPaginated internally
   * @deprecated Use getPaginated with trangThai param instead
   */
  async getByTrangThai(trangThai: DuAnTrangThai): Promise<DuAn[]> {
    const response = await this.getPaginated({ limit: 100, trangThai });
    return response.data;
  }
}

export const duAnService = new DuAnService();
