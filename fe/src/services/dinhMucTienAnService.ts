import { DinhMucTienAn } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface Resp extends Omit<DinhMucTienAn, 'id'> { _id?: string; id?: string; }

class DinhMucTienAnService extends ServiceBase {
  constructor() { super({ endpoint: '/mam-non/dinh-muc-tien-an' }); }
  private map(i: Resp): DinhMucTienAn { return { ...i, id: i._id || i.id || '' } as DinhMucTienAn; }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<DinhMucTienAn>> {
    const r = await this.get<{ data: Resp[]; meta: PaginatedResponse<DinhMucTienAn>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return { data: r.data.map((x) => this.map(x)), meta: r.meta };
  }
  async getAll(): Promise<DinhMucTienAn[]> { return (await this.get<Resp[]>({ endpoint: '/all' })).map((x) => this.map(x)); }
  async getById(id: string): Promise<DinhMucTienAn> { return this.map(await this.get<Resp>({ endpoint: `/${id}` })); }
  async create(data: Omit<DinhMucTienAn, 'id'>): Promise<DinhMucTienAn> { return this.map(await this.post<Resp>(data)); }
  async update(id: string, data: Partial<DinhMucTienAn>): Promise<DinhMucTienAn> { return this.map(await this.put<Resp>(data, { endpoint: `/${id}` })); }
  async remove(id: string): Promise<void> { return super.delete({ endpoint: `/${id}` }); }
  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const r = await this.get<{ exists: boolean }>({ endpoint: '/check-code', params: { code, excludeId } });
    return r.exists;
  }
  async getStats(): Promise<{ tong: number }> { return this.get<{ tong: number }>({ endpoint: '/stats' }); }
}
export const dinhMucTienAnService = new DinhMucTienAnService();
