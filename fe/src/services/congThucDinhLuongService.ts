import { CongThucDinhLuong } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface Resp extends Omit<CongThucDinhLuong, 'id'> { _id?: string; id?: string; }

class CongThucDinhLuongService extends ServiceBase {
  constructor() { super({ endpoint: '/mam-non/cong-thuc-dinh-luong' }); }
  private map(i: Resp): CongThucDinhLuong { return { ...i, id: i._id || i.id || '' } as CongThucDinhLuong; }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<CongThucDinhLuong>> {
    const r = await this.get<{ data: Resp[]; meta: PaginatedResponse<CongThucDinhLuong>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return { data: r.data.map((x) => this.map(x)), meta: r.meta };
  }
  async getAll(): Promise<CongThucDinhLuong[]> { return (await this.get<Resp[]>({ endpoint: '/all' })).map((x) => this.map(x)); }
  async getById(id: string): Promise<CongThucDinhLuong> { return this.map(await this.get<Resp>({ endpoint: `/${id}` })); }
  async create(data: Omit<CongThucDinhLuong, 'id'>): Promise<CongThucDinhLuong> { return this.map(await this.post<Resp>(data)); }
  async update(id: string, data: Partial<CongThucDinhLuong>): Promise<CongThucDinhLuong> { return this.map(await this.put<Resp>(data, { endpoint: `/${id}` })); }
  async remove(id: string): Promise<void> { return super.delete({ endpoint: `/${id}` }); }
  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const r = await this.get<{ exists: boolean }>({ endpoint: '/check-code', params: { code, excludeId } });
    return r.exists;
  }
  async getStats(): Promise<{ tong: number }> { return this.get<{ tong: number }>({ endpoint: '/stats' }); }
}
export const congThucDinhLuongService = new CongThucDinhLuongService();
