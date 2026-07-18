import { ServiceBase } from './base/service-base';

export interface VaiTroResponse {
  _id: string;
  ten: string;
  moTa: string;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

class VaiTroService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/vai-tro' });
  }

  async getAll(): Promise<VaiTroResponse[]> {
    return this.get<VaiTroResponse[]>({ endpoint: '' });
  }

  async getById(id: string): Promise<VaiTroResponse> {
    return this.get<VaiTroResponse>({ endpoint: `/${id}` });
  }

  async create(data: { ten: string; moTa?: string; isActive?: boolean }): Promise<VaiTroResponse> {
    return this.post<VaiTroResponse>(data, { endpoint: '' });
  }

  async update(id: string, data: Partial<{ ten: string; moTa: string; isActive: boolean }>): Promise<VaiTroResponse> {
    return this.put<VaiTroResponse>(data, { endpoint: `/${id}` });
  }

  async remove(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }
}

export const vaiTroService = new VaiTroService();
