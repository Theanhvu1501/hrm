import { ServiceBase } from './base/service-base';

interface PhanQuyenItem {
  _id: string;
  vaiTro: string;
  ten: string;
  moTa?: string;
  permissions: string[];
  isActive: boolean;
}

class PhanQuyenService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/phan-quyen' });
  }

  async getAll(): Promise<PhanQuyenItem[]> {
    return this.get<PhanQuyenItem[]>({ endpoint: '' });
  }

  async getByVaiTro(vaiTro: string): Promise<PhanQuyenItem | null> {
    return this.get<PhanQuyenItem | null>({ endpoint: `/vai-tro/${encodeURIComponent(vaiTro)}` });
  }

  async getPermissionsByVaiTro(vaiTro: string): Promise<string[]> {
    return this.get<string[]>({ endpoint: `/vai-tro/${encodeURIComponent(vaiTro)}/permissions` });
  }

  async savePermissions(vaiTro: string, permissions: string[]): Promise<PhanQuyenItem> {
    return this.put<PhanQuyenItem>({ permissions }, { endpoint: `/vai-tro/${encodeURIComponent(vaiTro)}/permissions` });
  }

  async create(data: Partial<PhanQuyenItem>): Promise<PhanQuyenItem> {
    return this.post<PhanQuyenItem>(data, { endpoint: '' });
  }

  async update(id: string, data: Partial<PhanQuyenItem>): Promise<PhanQuyenItem> {
    return this.put<PhanQuyenItem>(data, { endpoint: `/${id}` });
  }

  async remove(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }
}

export const phanQuyenService = new PhanQuyenService();
