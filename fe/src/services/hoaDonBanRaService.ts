import { HoaDonBanRa } from '@/types';
import { ServiceBase } from './base/service-base';

interface Resp extends Omit<HoaDonBanRa, 'id'> {
  _id?: string;
  id?: string;
}

/** Sổ hóa đơn bán ra theo HĐ — /master-data/hoa-don-ban-ra (BE bọc { success, data }). */
class HoaDonBanRaService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/hoa-don-ban-ra' });
  }

  private map(i: Resp): HoaDonBanRa {
    return { ...i, id: i._id || i.id || '' } as HoaDonBanRa;
  }

  async getList(
    params: { hopDongId?: string; nam?: number; search?: string } = {},
  ): Promise<HoaDonBanRa[]> {
    const data = await this.get<Resp[]>({ params });
    return data.map((i) => this.map(i));
  }

  async create(data: Omit<HoaDonBanRa, 'id'>): Promise<HoaDonBanRa> {
    return this.map(await this.post<Resp>(data));
  }

  async update(id: string, data: Partial<HoaDonBanRa>): Promise<HoaDonBanRa> {
    return this.map(await this.put<Resp>(data, { endpoint: `/${id}` }));
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }
}

export const hoaDonBanRaService = new HoaDonBanRaService();
