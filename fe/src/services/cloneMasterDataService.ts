import { ServiceBase } from './base/service-base';

export interface CloneCategoryOption { key: string; label: string; }
export interface CloneBody { sourceTenantId: string; targetTenantId: string; categories: string[]; }
export interface PreviewRow { key: string; label: string; total: number; willInsert: number; willSkip: number; }
export interface ResultRow { key: string; label: string; inserted: number; skipped: number; error?: string; }

class CloneMasterDataService extends ServiceBase {
  constructor() { super({ endpoint: '/master-data/clone' }); }

  getCategories(): Promise<CloneCategoryOption[]> {
    return this.get<CloneCategoryOption[]>({ endpoint: '/categories' });
  }
  preview(body: CloneBody): Promise<PreviewRow[]> {
    return this.post<PreviewRow[]>(body, { endpoint: '/preview' });
  }
  execute(body: CloneBody): Promise<ResultRow[]> {
    return this.post<ResultRow[]>(body, { endpoint: '/execute' });
  }
}

export const cloneMasterDataService = new CloneMasterDataService();
