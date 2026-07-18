import { DiemDanhAn } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface Resp extends Omit<DiemDanhAn, 'id'> { _id?: string; id?: string; }

class DiemDanhAnService extends ServiceBase {
  constructor() { super({ endpoint: '/mam-non/diem-danh-an' }); }
  private map(i: Resp): DiemDanhAn { return { ...i, id: i._id || i.id || '' } as DiemDanhAn; }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<DiemDanhAn>> {
    const r = await this.get<{ data: Resp[]; meta: PaginatedResponse<DiemDanhAn>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return { data: r.data.map((x) => this.map(x)), meta: r.meta };
  }
  async getAll(): Promise<DiemDanhAn[]> { return (await this.get<Resp[]>({ endpoint: '/all' })).map((x) => this.map(x)); }
  async getById(id: string): Promise<DiemDanhAn> { return this.map(await this.get<Resp>({ endpoint: `/${id}` })); }
  async create(data: Omit<DiemDanhAn, 'id'>): Promise<DiemDanhAn> { return this.map(await this.post<Resp>(data)); }
  async update(id: string, data: Partial<DiemDanhAn>): Promise<DiemDanhAn> { return this.map(await this.put<Resp>(data, { endpoint: `/${id}` })); }
  async remove(id: string): Promise<void> { return super.delete({ endpoint: `/${id}` }); }
  async getStats(): Promise<{ tong: number }> { return this.get<{ tong: number }>({ endpoint: '/stats' }); }
}
export const diemDanhAnService = new DiemDanhAnService();
