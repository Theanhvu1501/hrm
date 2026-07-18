import { TaiKhoanNganHang } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface NganHangResponse extends Omit<TaiKhoanNganHang, 'id'> {
  _id?: string;
  id?: string;
}

export interface NganHangPaginationParams extends PaginationParams {
  loai?: TaiKhoanNganHang['loai'];
}

export interface TaiKhoanNHStats {
  tongTaiKhoan: number;
  tienMat: number;
  nganHang: number;
  tongSoDuTienMat: number;
  tongSoDuNganHang: number;
  tongSoDu: number;
}

class NganHangService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/ngan-hang' });
  }

  private mapNganHang(item: NganHangResponse): TaiKhoanNganHang {
    return {
      ...item,
      id: item._id || item.id || '',
    } as TaiKhoanNganHang;
  }

  async getPaginated(
    params: NganHangPaginationParams = {},
  ): Promise<PaginatedResponse<TaiKhoanNganHang>> {
    const response = await this.get<{
      data: NganHangResponse[];
      meta: PaginatedResponse<TaiKhoanNganHang>['meta'];
    }>({
      params: {
        page: params.page || 1,
        limit: params.limit || 10,
        search: params.search,
        loai: params.loai,
      },
    });
    return {
      data: response.data.map((item) => this.mapNganHang(item)),
      meta: response.meta,
    };
  }

  /**
   * Get total count from separate API
   */
  async getTotal(search?: string): Promise<number> {
    const result = await this.get<{ total: number }>({
      endpoint: '/total',
      params: { search },
    });
    return result.total;
  }

  /**
   * Get statistics from separate API
   */
  async getStats(): Promise<TaiKhoanNHStats> {
    const result = await this.get<{
      tongNganHang: number;
      nganHang: number;
      tienMat: number;
    }>({
      endpoint: '/stats',
    });
    // Map backend response to frontend stats format
    return {
      tongTaiKhoan: result.tongNganHang,
      tienMat: result.tienMat,
      nganHang: result.nganHang,
      tongSoDuTienMat: 0, // TODO: Add to backend if needed
      tongSoDuNganHang: 0, // TODO: Add to backend if needed
      tongSoDu: 0, // TODO: Add to backend if needed
    };
  }

  /**
   * Check if ma already exists
   */
  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  /**
   * @deprecated Use getPaginated instead for better performance
   */
  async getAll(): Promise<TaiKhoanNganHang[]> {
    const response = await this.getPaginated({ limit: 100 });
    return response.data;
  }

  async getById(id: string): Promise<TaiKhoanNganHang> {
    const data = await this.get<NganHangResponse>({ endpoint: `/${id}` });
    return this.mapNganHang(data);
  }

  async create(data: Omit<TaiKhoanNganHang, 'id'>): Promise<TaiKhoanNganHang> {
    const result = await this.post<NganHangResponse>(data);
    return this.mapNganHang(result);
  }

  async update(
    id: string,
    data: Partial<TaiKhoanNganHang>,
  ): Promise<TaiKhoanNganHang> {
    const result = await this.put<NganHangResponse>(data, {
      endpoint: `/${id}`,
    });
    return this.mapNganHang(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }
}

export const nganHangService = new NganHangService();
