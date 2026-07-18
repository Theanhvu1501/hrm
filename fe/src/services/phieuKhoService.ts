import { PhieuKho } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface PhieuKhoResponse extends Omit<PhieuKho, 'id'> {
  _id?: string;
  id?: string;
}

export interface PhieuKhoPaginationParams extends PaginationParams {
  loaiPhieu?: string;
  tuNgay?: string;
  denNgay?: string;
}

export interface PhieuKhoStats {
  tongPhieu: number;
  tongTien: number;
}

class PhieuKhoService extends ServiceBase {
  constructor() {
    super({ endpoint: '/kho/phieu' });
  }

  private mapPhieuKho(item: PhieuKhoResponse): PhieuKho {
    return {
      ...item,
      id: item._id || item.id || '',
    } as PhieuKho;
  }

  async getPaginated(params: PhieuKhoPaginationParams = {}): Promise<PaginatedResponse<PhieuKho>> {
    const response = await this.get<{ data: PhieuKhoResponse[]; meta: PaginatedResponse<PhieuKho>['meta'] }>({
      params: {
        page: params.page || 1,
        limit: params.limit || 10,
        search: params.search,
        loaiPhieu: params.loaiPhieu,
        tuNgay: params.tuNgay,
        denNgay: params.denNgay,
      },
    });
    return {
      data: response.data.map((item) => this.mapPhieuKho(item)),
      meta: response.meta,
    };
  }

  async getById(id: string): Promise<PhieuKho> {
    const data = await this.get<PhieuKhoResponse>({ endpoint: `/${id}` });
    return this.mapPhieuKho(data);
  }

  async create(data: Omit<PhieuKho, 'id'>): Promise<PhieuKho> {
    const result = await this.post<PhieuKhoResponse>(data);
    return this.mapPhieuKho(result);
  }

  async update(id: string, data: Partial<PhieuKho>): Promise<PhieuKho> {
    const result = await this.put<PhieuKhoResponse>(data, { endpoint: `/${id}` });
    return this.mapPhieuKho(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async getNextSo(loaiPhieu: string): Promise<string> {
    const r = await this.get<{ soPhieu: string }>({
      endpoint: '/next-so',
      params: { loaiPhieu },
    });
    return r.soPhieu;
  }

  async getStats(loaiPhieu?: string): Promise<PhieuKhoStats> {
    return this.get<PhieuKhoStats>({ endpoint: '/stats', params: { loaiPhieu } });
  }
}

export const phieuKhoService = new PhieuKhoService();
