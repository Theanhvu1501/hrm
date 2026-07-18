import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { Repository } from 'typeorm';
import { CLONE_CATEGORIES, CloneCategory } from './clone-master-data.registry';

export interface PreviewRow { key: string; label: string; total: number; willInsert: number; willSkip: number; }
export interface ResultRow { key: string; label: string; inserted: number; skipped: number; error?: string; }
export type CategoryRepoMap = Record<string, Repository<any>>;

@Injectable()
export class CloneMasterDataService {
  private readonly logger = new Logger(CloneMasterDataService.name);

  constructor(
    // Map entityName -> raw repo. Inject 7 tokens then aggregate.
    private readonly repos: CategoryRepoMap,
  ) {}

  getCategories() {
    return CLONE_CATEGORIES.map((c) => ({ key: c.key, label: c.label }));
  }

  private selected(keys: string[]): CloneCategory[] {
    if (!Array.isArray(keys)) throw new BadRequestException('categories phải là một mảng');
    const set = new Set(keys);
    const cats = CLONE_CATEGORIES.filter((c) => set.has(c.key));
    const unknown = keys.filter((k) => !CLONE_CATEGORIES.some((c) => c.key === k));
    if (unknown.length) throw new BadRequestException(`Danh mục không hợp lệ: ${unknown.join(', ')}`);
    return cats; // giữ thứ tự registry (đảm bảo ho-so-chung-tu trước quy-chuan)
  }

  /**
   * Validate src/dst IDs — format only (ObjectId parse).
   * Tenant existence is validated implicitly by the entity queries (returns empty if not found).
   * CONCERN: previously validated tenant existence via identity DB repo; now removed to avoid
   * identity DB coupling. If src/dst do not exist, preview shows 0 rows and execute inserts nothing.
   */
  private validate(src: string, dst: string): void {
    if (!src || !dst) throw new BadRequestException('Thiếu công ty nguồn/đích');
    if (src === dst) throw new BadRequestException('Công ty nguồn và đích phải khác nhau');
    const toObjectId = (id: string, label: string) => {
      try { return new ObjectId(id); }
      catch { throw new BadRequestException(`ID ${label} không hợp lệ`); }
    };
    toObjectId(src, 'nguồn');
    toObjectId(dst, 'đích');
  }

  async preview(src: string, dst: string, keys: string[]): Promise<PreviewRow[]> {
    this.validate(src, dst);
    const rows: PreviewRow[] = [];
    for (const cat of this.selected(keys)) {
      const repo = this.repos[cat.entityName];
      const [srcDocs, dstDocs] = await Promise.all([
        repo.find({ where: { tenantId: src } }),
        repo.find({ where: { tenantId: dst } }),
      ]);
      const dstKeys = new Set(dstDocs.map((d) => cat.dedupKey(d)));
      const willSkip = srcDocs.filter((d) => dstKeys.has(cat.dedupKey(d))).length;
      rows.push({ key: cat.key, label: cat.label, total: srcDocs.length, willInsert: srcDocs.length - willSkip, willSkip });
    }
    return rows;
  }

  async execute(src: string, dst: string, keys: string[]): Promise<ResultRow[]> {
    this.validate(src, dst);
    const idMaps: Record<string, Map<string, string>> = {};
    const results: ResultRow[] = [];
    for (const cat of this.selected(keys)) {
      let inserted = 0, skipped = 0;
      try {
        const repo = this.repos[cat.entityName];
        const [srcDocs, dstDocs] = await Promise.all([
          repo.find({ where: { tenantId: src } }),
          repo.find({ where: { tenantId: dst } }),
        ]);
        const dstByKey = new Map(dstDocs.map((d) => [cat.dedupKey(d), d]));
        // Pass 1: build idMap old _id -> target _id (đích đang có hoặc id mới)
        const idMap = new Map<string, string>();
        for (const doc of srcDocs) {
          const existing = dstByKey.get(cat.dedupKey(doc));
          idMap.set(String(doc._id), existing ? String(existing._id) : String(new ObjectId()));
        }
        idMaps[cat.key] = idMap;
        // Pass 2: insert bản chưa trùng
        for (const doc of srcDocs) {
          if (dstByKey.has(cat.dedupKey(doc))) { skipped++; continue; }
          const clone: any = { ...doc, _id: new ObjectId(idMap.get(String(doc._id))), tenantId: dst };
          if (cat.remap) cat.remap(clone, idMaps);
          await repo.save(clone);
          inserted++;
        }
        results.push({ key: cat.key, label: cat.label, inserted, skipped });
      } catch (e: any) {
        this.logger.error(`Clone ${cat.key} lỗi: ${e.message}`);
        results.push({ key: cat.key, label: cat.label, inserted, skipped, error: e.message });
      }
    }
    return results;
  }
}
