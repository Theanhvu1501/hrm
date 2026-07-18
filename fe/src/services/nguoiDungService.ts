import { NguoiDung, VaiTro } from '@/types';
import { ServiceBase } from './base/service-base';

export interface NguoiDungStats {
  tongNguoiDung: number;
  dangHoatDong: number;
  daKhoa: number;
  theoVaiTro: Record<VaiTro, number>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  vaiTro?: VaiTro;
  trangThai?: 'HOAT_DONG' | 'KHOA';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Transform backend response to frontend format
const transformUser = (user: Record<string, unknown>): NguoiDung => ({
  id: (user._id as string) || (user.id as string),
  hoTen: user.hoTen as string,
  email: user.email as string,
  vaiTro: (user.tenantRole as VaiTro) || (user.vaiTro as VaiTro),
  isSuperAdmin: (user.isSuperAdmin as boolean) || false,
  tenants: (user.tenants as NguoiDung['tenants']) || [],
  trangThai: user.trangThai as 'HOAT_DONG' | 'KHOA',
  isActive: user.isActive as boolean,
});

class NguoiDungService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/nguoi-dung' });
  }

  async getAll(params?: PaginationParams): Promise<PaginatedResponse<NguoiDung>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.vaiTro && params.vaiTro !== ('all' as unknown)) queryParams.append('vaiTro', params.vaiTro);
    if (params?.trangThai) queryParams.append('trangThai', params.trangThai);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    const response = await this.get<{
      data: Record<string, unknown>[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>({ endpoint });

    return {
      data: response.data.map(transformUser),
      total: response.total,
      page: response.page,
      limit: response.limit,
      totalPages: response.totalPages,
    };
  }

  async getById(id: string): Promise<NguoiDung> {
    const response = await this.get<Record<string, unknown>>({ endpoint: `/${id}` });
    return transformUser(response);
  }

  async create(data: Omit<NguoiDung, 'id'>): Promise<NguoiDung> {
    const response = await this.post<Record<string, unknown>>(data);
    return transformUser(response);
  }

  async update(id: string, data: Partial<NguoiDung>): Promise<NguoiDung> {
    const response = await this.put<Record<string, unknown>>(data, { endpoint: `/${id}` });
    return transformUser(response);
  }

  async deleteUser(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  async toggleTrangThai(id: string): Promise<NguoiDung> {
    const response = await this.patch<Record<string, unknown>>({}, { endpoint: `/${id}/toggle-status` });
    return transformUser(response);
  }

  async getStats(): Promise<NguoiDungStats> {
    return this.get<NguoiDungStats>({ endpoint: '/stats' });
  }

  async checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      const response = await this.getAll({ search: email, limit: 1 });
      return response.data.some(
        (nd) => nd.email.toLowerCase() === email.toLowerCase() && nd.id !== excludeId
      );
    } catch {
      return false;
    }
  }

  async getAvailableUsers(search?: string): Promise<Array<{ id: string; email: string; hoTen: string }>> {
    const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await this.get<Array<Record<string, unknown>>>({ endpoint: `/available-users${queryParams}` });
    return response.map((u) => ({
      id: (u._id as string) || (u.id as string),
      email: u.email as string,
      hoTen: u.hoTen as string,
    }));
  }

  async addExistingUser(userId: string, vaiTro: string): Promise<NguoiDung> {
    const response = await this.post<Record<string, unknown>>({ userId, vaiTro }, { endpoint: '/add-existing' });
    return transformUser(response);
  }

}

export const nguoiDungService = new NguoiDungService();
