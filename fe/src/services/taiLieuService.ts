import { ServiceBase, getAuthToken } from './base/service-base';
import { API_CONFIG } from '@/config/api';

export type TaiLieuType = 'file' | 'youtube';

export interface TaiLieu {
  _id: string;
  category: string;
  title: string;
  moTa?: string;
  type: TaiLieuType;
  storageKey?: string;
  tenFile?: string;
  mimeType?: string;
  size?: number;
  youtubeUrl?: string;
  youtubeId?: string;
  createdAt: string;
}

class TaiLieuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/tai-lieu' });
  }

  async list(category: string): Promise<TaiLieu[]> {
    return this.get<TaiLieu[]>({ params: { category } });
  }

  async uploadFile(p: {
    category: string;
    title: string;
    moTa?: string;
    file: File;
  }): Promise<TaiLieu> {
    const fd = new FormData();
    fd.append('file', p.file);
    fd.append('title', p.title);
    fd.append('category', p.category);
    if (p.moTa) fd.append('moTa', p.moTa);
    return this.post<TaiLieu>(fd);
  }

  async addYoutube(p: {
    category: string;
    title: string;
    moTa?: string;
    youtubeUrl: string;
  }): Promise<TaiLieu> {
    return this.post<TaiLieu>(p, { endpoint: '/youtube' });
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  /**
   * Tải file dạng blob (iframe không gửi được header JWT nên phải dùng fetch + objectURL).
   * Nhớ gọi URL.revokeObjectURL khi không dùng nữa.
   */
  async fetchFileObjectUrl(id: string): Promise<string> {
    const token = getAuthToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}/tai-lieu/${id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Không tải được file');
    return URL.createObjectURL(await res.blob());
  }
}

export const taiLieuService = new TaiLieuService();
