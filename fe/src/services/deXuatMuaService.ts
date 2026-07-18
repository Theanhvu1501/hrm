import { DeXuatMua } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface Resp extends Omit<DeXuatMua, 'id'> { _id?: string; id?: string; }

class DeXuatMuaService extends ServiceBase {
  constructor() { super({ endpoint: '/mam-non/de-xuat-mua' }); }
  private map(i: Resp): DeXuatMua { return { ...i, id: i._id || i.id || '' } as DeXuatMua; }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<DeXuatMua>> {
    const r = await this.get<{ data: Resp[]; meta: PaginatedResponse<DeXuatMua>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return { data: r.data.map((x) => this.map(x)), meta: r.meta };
  }
  async getById(id: string): Promise<DeXuatMua> { return this.map(await this.get<Resp>({ endpoint: `/${id}` })); }
  async create(data: Omit<DeXuatMua, 'id'>): Promise<DeXuatMua> { return this.map(await this.post<Resp>(data)); }
  async update(id: string, data: Partial<DeXuatMua>): Promise<DeXuatMua> { return this.map(await this.put<Resp>(data, { endpoint: `/${id}` })); }
  async remove(id: string): Promise<void> { return super.delete({ endpoint: `/${id}` }); }

  async submit(id: string): Promise<DeXuatMua> { return this.map(await this.post<Resp>({}, { endpoint: `/${id}/submit` })); }
  async approve(id: string): Promise<DeXuatMua> { return this.map(await this.post<Resp>({}, { endpoint: `/${id}/approve` })); }
  async reject(id: string, lyDoTuChoi: string): Promise<DeXuatMua> { return this.map(await this.post<Resp>({ lyDoTuChoi }, { endpoint: `/${id}/reject` })); }
  async nhanHang(id: string): Promise<DeXuatMua> { return this.map(await this.post<Resp>({}, { endpoint: `/${id}/nhan-hang` })); }
}
export const deXuatMuaService = new DeXuatMuaService();
