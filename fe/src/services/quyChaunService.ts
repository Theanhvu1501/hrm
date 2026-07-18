import { QuyChuan } from '@/types';
import { ServiceBase } from './base/service-base';

export interface QuyChaunStats {
  tongQuyChuan: number;
  phieuThu: number;
  phieuChi: number;
  baoCo: number;
  baoNo: number;
}

export interface CreateQuyChaunDto {
  loaiGiaoDich: string;
  nghiepVu: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  moTa?: string;
}

export interface UpdateQuyChaunDto extends Partial<CreateQuyChaunDto> {}

export interface QuyChaunPaginationParams {
  page?: number;
  limit?: number;
  keyword?: string;
  loaiGiaoDich?: string;
}

interface QuyChaunResponse extends Omit<QuyChuan, 'id'> {
  _id?: string;
  id?: string;
}

export interface QuyChaunPaginatedResponse {
  data: QuyChuan[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class QuyChaunService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/quy-chuan' });
  }

  private mapQuyChuan(item: QuyChaunResponse): QuyChuan {
    return {
      ...item,
      id: item._id || item.id || '',
    } as QuyChuan;
  }

  async getAll(): Promise<QuyChuan[]> {
    const data = await this.get<QuyChaunResponse[]>();
    return data.map((item) => this.mapQuyChuan(item));
  }

  async getAllPaginated(params: QuyChaunPaginationParams): Promise<QuyChaunPaginatedResponse> {
    const queryParams: Record<string, string> = {};

    if (params.page) queryParams.page = params.page.toString();
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.loaiGiaoDich) queryParams.loaiGiaoDich = params.loaiGiaoDich;

    const response = await this.get<{ data: QuyChaunResponse[]; meta: QuyChaunPaginatedResponse['meta'] }>({ params: queryParams });
    return {
      data: response.data.map((item) => this.mapQuyChuan(item)),
      meta: response.meta,
    };
  }

  async getById(id: string): Promise<QuyChuan> {
    const data = await this.get<QuyChaunResponse>({ endpoint: `/${id}` });
    return this.mapQuyChuan(data);
  }

  async getByLoaiGiaoDich(loai: string): Promise<QuyChuan[]> {
    const data = await this.get<QuyChaunResponse[]>({ endpoint: `/by-loai/${loai}` });
    return data.map((item) => this.mapQuyChuan(item));
  }

  async search(keyword: string): Promise<QuyChuan[]> {
    const data = await this.get<QuyChaunResponse[]>({
      endpoint: '/search',
      params: { keyword }
    });
    return data.map((item) => this.mapQuyChuan(item));
  }

  async searchPaginated(params: QuyChaunPaginationParams): Promise<QuyChaunPaginatedResponse> {
    const queryParams: Record<string, string> = {};

    if (params.page) queryParams.page = params.page.toString();
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.loaiGiaoDich) queryParams.loaiGiaoDich = params.loaiGiaoDich;

    const response = await this.get<{ data: QuyChaunResponse[]; meta: QuyChaunPaginatedResponse['meta'] }>({
      endpoint: '/search',
      params: queryParams
    });
    return {
      data: response.data.map((item) => this.mapQuyChuan(item)),
      meta: response.meta,
    };
  }

  async getStats(keyword?: string): Promise<QuyChaunStats> {
    const params: Record<string, string> = {};
    if (keyword) params.keyword = keyword;
    
    return this.get<QuyChaunStats>({ endpoint: '/stats', params });
  }

  async getSuggestedAccounts(
    loaiGiaoDich: string, 
    nghiepVu: string
  ): Promise<{ taiKhoanNo: string; taiKhoanCo: string } | null> {
    return this.get<{ taiKhoanNo: string; taiKhoanCo: string } | null>({
      endpoint: '/suggested-accounts',
      params: { loaiGiaoDich, nghiepVu }
    });
  }

  async duplicateCheck(
    loaiGiaoDich: string, 
    nghiepVu: string, 
    excludeId?: string
  ): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/duplicate-check',
      params: { loaiGiaoDich, nghiepVu, excludeId }
    });
    return result.exists;
  }

  async create(data: CreateQuyChaunDto): Promise<QuyChuan> {
    const result = await this.post<QuyChaunResponse>(data);
    return this.mapQuyChuan(result);
  }

  async update(id: string, data: UpdateQuyChaunDto): Promise<QuyChuan> {
    const result = await this.put<QuyChaunResponse>(data, { endpoint: `/${id}` });
    return this.mapQuyChuan(result);
  }

  async remove(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }
}

export const quyChauanService = new QuyChaunService();
