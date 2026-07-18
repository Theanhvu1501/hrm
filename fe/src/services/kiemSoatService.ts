import { KiemSoatChiPhi } from '@/types';
import { ServiceBase } from './base/service-base';

class KiemSoatService extends ServiceBase {
  constructor() { super({ endpoint: '/mam-non/kiem-soat' }); }
  async getChiPhi(params: { tuNgay?: string; denNgay?: string; nguongPct?: number }): Promise<KiemSoatChiPhi> {
    return this.get<KiemSoatChiPhi>({ endpoint: '/chi-phi', params });
  }
  async chotTieuHao(params: { tuNgay?: string; denNgay?: string }): Promise<{ chiPhiThuc: number; soPhieuXuat?: string; chungTuId?: string }> {
    return this.post({}, { endpoint: '/chot-tieu-hao', params });
  }
}
export const kiemSoatService = new KiemSoatService();
