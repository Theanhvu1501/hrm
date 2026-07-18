import { ServiceBase } from './base/service-base';
import type { Glossary } from '@/types/tenant';

export interface LinhVuc {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  order: number;
  isActive: boolean;
  menuKeys: string[];
  glossary: Glossary;
}

export interface CreateLinhVucDto {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
  menuKeys?: string[];
  glossary?: Glossary;
}

export interface UpdateLinhVucDto {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
  menuKeys?: string[];
  glossary?: Glossary;
}

class LinhVucService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/linh-vuc' });
  }

  async getAll(): Promise<LinhVuc[]> {
    const res = await this.get<Array<Record<string, unknown>>>({});
    return res.map(this.transform);
  }

  async create(data: CreateLinhVucDto): Promise<LinhVuc> {
    const res = await this.post<Record<string, unknown>>(data, {});
    return this.transform(res);
  }

  async update(id: string, data: UpdateLinhVucDto): Promise<LinhVuc> {
    const res = await this.put<Record<string, unknown>>(data, { endpoint: `/${id}` });
    return this.transform(res);
  }

  async deleteLinhVuc(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  private transform(x: Record<string, unknown>): LinhVuc {
    return {
      id: (x._id as string) || (x.id as string),
      code: x.code as string,
      name: x.name as string,
      description: x.description as string | undefined,
      icon: (x.icon as string) || 'AppstoreOutlined',
      color: (x.color as string) || '#1f7769',
      order: (x.order as number) ?? 0,
      isActive: x.isActive as boolean,
      menuKeys: (x.menuKeys as string[]) ?? [],
      glossary: (x.glossary as Glossary) ?? {},
    };
  }
}

export const linhVucService = new LinhVucService();
