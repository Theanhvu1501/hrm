import {
  ServiceBase,
  PaginatedResponse,
  PaginationParams,
} from './base/service-base';

export type ThueSuat = '0' | '5' | '8' | '10' | 'KCT' | 'KKKT';

export const THUE_SUAT_OPTIONS: { value: ThueSuat; label: string }[] = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
  { value: 'KCT', label: 'Không chịu thuế' },
  { value: 'KKKT', label: 'Không kê khai/khấu trừ' },
];

export interface BangKeRecord {
  id: string;
  _id?: string;
  ngayHoaDon: string;
  soHoaDon: string;
  kyHieuHoaDon?: string;
  tenHangHoa?: string;
  giaTriChuaThue: number;
  thueSuat: ThueSuat;
  tienThue: number;
  tongThanhToan: number;
  ghiChu?: string;
  // Mua vào
  tenNguoiBan?: string;
  mstNguoiBan?: string;
  // Bán ra
  tenNguoiMua?: string;
  mstNguoiMua?: string;
}

export interface BangKeQuery extends PaginationParams {
  tuNgay?: string;
  denNgay?: string;
  quy?: number;
  nam?: number;
}

class BangKeService extends ServiceBase {
  constructor(endpoint: string) {
    super({ endpoint });
  }

  private map = (i: BangKeRecord & { _id?: string }): BangKeRecord => ({
    ...i,
    id: i._id || i.id || '',
  });

  async getPaginated(
    params: BangKeQuery = {},
  ): Promise<PaginatedResponse<BangKeRecord>> {
    const res = await this.get<{
      data: BangKeRecord[];
      meta: PaginatedResponse<BangKeRecord>['meta'];
    }>({ params });
    return { data: res.data.map(this.map), meta: res.meta };
  }

  async create(payload: Partial<BangKeRecord>): Promise<BangKeRecord> {
    const r = await this.post<BangKeRecord>(payload);
    return this.map(r);
  }

  async update(
    id: string,
    payload: Partial<BangKeRecord>,
  ): Promise<BangKeRecord> {
    const r = await this.put<BangKeRecord>(payload, { endpoint: `/${id}` });
    return this.map(r);
  }

  async remove(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }

  /** Tạo hàng loạt hóa đơn từ file Excel. Trả về số bản ghi đã tạo. */
  async importMany(items: unknown[]): Promise<number> {
    const r = await this.post<{ created: number }>(
      { items },
      { endpoint: '/import' },
    );
    return r.created;
  }

  /** Trả về các khóa hóa đơn đã tồn tại trên hệ thống (số HĐ|ký hiệu|MST). */
  async checkDuplicates(keys: DuplicateKey[]): Promise<string[]> {
    return this.post<string[]>({ keys }, { endpoint: '/check-duplicates' });
  }
}

export interface DuplicateKey {
  soHoaDon: string;
  kyHieuHoaDon?: string;
  mst?: string;
}

export const bangKeMuaVaoService = new BangKeService(
  '/tax/bang-ke-mua-vao',
);
export const bangKeBanRaService = new BangKeService('/tax/bang-ke-ban-ra');

// ===== Báo cáo =====

export interface TongHopThue {
  nam: number;
  quy: number | null;
  vatDauVao: number;
  vatDauRa: number;
  vatPhaiNop: number;
  vatConKhauTru: number;
  nghiaVuNganSach: {
    thueTNDN: number;
    vatPhaiNop: number;
    thueTNCN: number;
    bhxh: number;
    bhyt: number;
    bhtn: number;
  };
}

export interface TNDNQuyData {
  quy: number;
  dt511: number;
  dt515: number;
  dt711: number;
  cp632: number;
  cp641: number;
  cp642: number;
  cp811: number;
  chiPhiKhongTru: number;
  thuNhapMien: number;
  loChuyen: number;
  doanhThuLuyKe: number;
  thueSuat: number;
  tongChiPhi: number;
  lnTruocThue: number;
  thuNhapTinhThue: number;
  thueTNDN: number;
  lnSauThue: number;
  /** Tổng chi phí không được trừ tự tính (từ chứng từ) + điều chỉnh tay, per nhóm.
   *  Index: 0=DV/hàng hóa, 1=TSCĐ/CCDC, 2=nhân công, 3=tài chính/khác */
  cpKhongTruAuto?: number[];
}

export interface BaoCaoTNDN {
  nam: number;
  quy: TNDNQuyData[];
  luyKe: TNDNQuyData;
}

export interface DieuChinhThue {
  nam: number;
  cpkdtDichVuHangHoa: number[];
  cpkdtTscdCcdc: number[];
  cpkdtNhanCong: number[];
  cpkdtTaiChinhKhac: number[];
  thuNhapMienThue: number[];
  loDuocChuyen: number[];
  thueTNCN: number[];
  bhxh3383: number[];
  bhyt3384: number[];
  bhtn3386: number[];
}

export interface NvcsRow {
  tt: string;
  chiTieu: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  luyKe: number;
}

export interface NvcsSection {
  ma: 'TNDN' | 'GTGT' | 'TNCN' | 'BHXH';
  tieuDe: string;
  rows: NvcsRow[];
}

export interface NghiaVuChinhSach {
  nam: number;
  sections: NvcsSection[];
}

class TaxReportService extends ServiceBase {
  constructor() {
    super({ endpoint: '/tax' });
  }

  async getTongHop(nam: number, quy?: number): Promise<TongHopThue> {
    return this.get<TongHopThue>({ endpoint: '/tong-hop', params: { nam, quy } });
  }

  async getBaoCaoTNDN(nam: number): Promise<BaoCaoTNDN> {
    return this.get<BaoCaoTNDN>({ endpoint: '/bao-cao-tndn', params: { nam } });
  }

  async getNghiaVuChinhSach(nam: number): Promise<NghiaVuChinhSach> {
    return this.get<NghiaVuChinhSach>({
      endpoint: '/nghia-vu-chinh-sach',
      params: { nam },
    });
  }

  async getDieuChinh(nam: number): Promise<DieuChinhThue> {
    return this.get<DieuChinhThue>({
      endpoint: '/dieu-chinh-thue',
      params: { nam },
    });
  }

  async putDieuChinh(
    nam: number,
    payload: Partial<DieuChinhThue>,
  ): Promise<DieuChinhThue> {
    return this.put<DieuChinhThue>(payload, {
      endpoint: '/dieu-chinh-thue',
      params: { nam },
    });
  }
}

export const taxReportService = new TaxReportService();
