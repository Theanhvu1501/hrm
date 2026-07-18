import { ServiceBase } from '@/services/base/service-base';
import type { Glossary } from '@/types/tenant';

export interface Nganh {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  glossary: Glossary;
}

class NganhService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/nganh' });
  }

  async getAll(): Promise<Nganh[]> {
    const res = await this.get<Array<Record<string, unknown>>>({});
    return res.map(this.transform);
  }

  async update(id: string, data: { glossary?: Glossary; name?: string; isActive?: boolean }): Promise<Nganh> {
    const res = await this.put<Record<string, unknown>>(data, { endpoint: `/${id}` });
    return this.transform(res);
  }

  private transform(x: Record<string, unknown>): Nganh {
    return {
      id: (x._id as string) || (x.id as string),
      code: x.code as string,
      name: x.name as string,
      description: x.description as string | undefined,
      isActive: x.isActive as boolean,
      glossary: (x.glossary as Glossary) ?? {},
    };
  }
}

export const nganhService = new NganhService();
