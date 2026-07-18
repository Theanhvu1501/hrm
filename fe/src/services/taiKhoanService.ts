import { TaiKhoan } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface TaiKhoanResponse extends Omit<TaiKhoan, 'id'> {
  _id?: string;
  id?: string;
}

export interface TaiKhoanPaginationParams extends PaginationParams {
  nhom?: string;
}

class TaiKhoanService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/tai-khoan' });
  }

  private mapTaiKhoan(item: TaiKhoanResponse): TaiKhoan {
    return {
      ...item,
      id: item._id || item.id || '',
    } as TaiKhoan;
  }

  async getPaginated(params: TaiKhoanPaginationParams = {}): Promise<PaginatedResponse<TaiKhoan>> {
    const response = await this.get<{ data: TaiKhoanResponse[]; meta: PaginatedResponse<TaiKhoan>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search, nhom: params.nhom },
    });
    return {
      data: response.data.map((item) => this.mapTaiKhoan(item)),
      meta: response.meta,
    };
  }

  /**
   * Get total count from separate API
   */
  async getTotal(params: { search?: string; nhom?: string } = {}): Promise<number> {
    const result = await this.get<{ total: number }>({
      endpoint: '/total',
      params: { search: params.search, nhom: params.nhom },
    });
    return result.total;
  }

  /**
   * @deprecated Use getPaginated instead for better performance
   */
  async getAll(): Promise<TaiKhoan[]> {
    const response = await this.getPaginated({ limit: 100 });
    return response.data;
  }

  async getById(id: string): Promise<TaiKhoan> {
    const data = await this.get<TaiKhoanResponse>({ endpoint: `/${id}` });
    return this.mapTaiKhoan(data);
  }

  async create(data: Omit<TaiKhoan, 'id'>): Promise<TaiKhoan> {
    const result = await this.post<TaiKhoanResponse>(data);
    return this.mapTaiKhoan(result);
  }

  async update(id: string, data: Partial<TaiKhoan>): Promise<TaiKhoan> {
    const result = await this.put<TaiKhoanResponse>(data, { endpoint: `/${id}` });
    return this.mapTaiKhoan(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<TaiKhoan[]> {
    const data = await this.get<TaiKhoanResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapTaiKhoan(item));
  }

  async getHierarchy(): Promise<TaiKhoan[]> {
    const data = await this.get<TaiKhoanResponse[]>({ endpoint: '/hierarchy' });
    return data.map((item) => this.mapTaiKhoan(item));
  }

  async getParentAccounts(): Promise<TaiKhoan[]> {
    const data = await this.get<TaiKhoanResponse[]>({ endpoint: '/parents' });
    return data.map((item) => this.mapTaiKhoan(item));
  }

  async getByNhom(nhom: string): Promise<TaiKhoan[]> {
    const data = await this.get<TaiKhoanResponse[]>({ endpoint: `/nhom/${nhom}` });
    return data.map((item) => this.mapTaiKhoan(item));
  }

  /**
   * Get leaf accounts (accounts without children - lowest level)
   */
  async getLeafAccounts(): Promise<TaiKhoan[]> {
    const data = await this.get<TaiKhoanResponse[]>({ endpoint: '/leaf' });
    return data.map((item) => this.mapTaiKhoan(item));
  }
}

export const taiKhoanService = new TaiKhoanService();
