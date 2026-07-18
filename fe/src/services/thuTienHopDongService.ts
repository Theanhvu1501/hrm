import { ThuTienHopDong } from '@/types';
import { ServiceBase } from './base/service-base';

interface Resp extends Omit<ThuTienHopDong, 'id'> {
  _id?: string;
  id?: string;
}

/** Sổ thu tiền theo HĐ — /master-data/thu-tien-hop-dong (BE bọc { success, data }). */
class ThuTienHopDongService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/thu-tien-hop-dong' });
  }

  private map(i: Resp): ThuTienHopDong {
    return { ...i, id: i._id || i.id || '' } as ThuTienHopDong;
  }

  async getList(
    params: { hopDongId?: string; nam?: number; search?: string } = {},
  ): Promise<ThuTienHopDong[]> {
    const data = await this.get<Resp[]>({ params });
    return data.map((i) => this.map(i));
  }

  async create(data: Omit<ThuTienHopDong, 'id'>): Promise<ThuTienHopDong> {
    return this.map(await this.post<Resp>(data));
  }

  async update(id: string, data: Partial<ThuTienHopDong>): Promise<ThuTienHopDong> {
    return this.map(await this.put<Resp>(data, { endpoint: `/${id}` }));
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }
}

export const thuTienHopDongService = new ThuTienHopDongService();
