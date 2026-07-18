import { ChungTu, LoaiChungTu, DanhMuc } from '@/types';
import { ServiceBase } from './base/service-base';

export interface PhieuStats {
  tongSo: number;
  tongTien: number;
}

export type PhieuSummaryType =
  | 'account' | 'team' | 'employee' | 'project' | 'investor'
  | 'product' | 'cash-flow' | 'management-group' | 'promotion-group';

export interface PhieuSummaryItem {
  key: string;
  ten?: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soLuong: number;
}

export interface CashFlowCompositionItem {
  ma: string;
  ten?: string;
  soTien: number;
}

export interface PhieuQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  doiTuong?: string;
  duAn?: string;
  boPhan?: string;
  taiKhoanNo?: string;
  taiKhoanCo?: string;
}

export interface CreatePhieuDto {
  ngay: string;
  soTien: number;
  noiDung: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  danhMuc?: DanhMuc;
}

export interface PaginatedPhieuResponse {
  data: ChungTu[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface ChungTuResponse extends Omit<ChungTu, 'id'> {
  _id?: string;
  id?: string;
}

const mapChungTu = (item: ChungTuResponse): ChungTu =>
  ({ ...item, id: item._id || item.id || '' } as ChungTu);

export class PhieuService extends ServiceBase {
  constructor(
    public readonly loai: LoaiChungTu,
    endpoint: string,
  ) {
    super({ endpoint });
  }

  async getAll(params?: PhieuQueryParams): Promise<PaginatedPhieuResponse> {
    const response = await this.get<{ data: ChungTuResponse[]; meta: PaginatedPhieuResponse['meta'] }>({ params });
    return { data: response.data.map(mapChungTu), meta: response.meta };
  }

  async getById(id: string): Promise<ChungTu> {
    const data = await this.get<ChungTuResponse>({ endpoint: `/../chung-tu/${id}` });
    return mapChungTu(data);
  }

  async create(dto: CreatePhieuDto): Promise<ChungTu> {
    const result = await this.post<ChungTuResponse>(dto);
    return mapChungTu(result);
  }

  async update(id: string, dto: Partial<CreatePhieuDto>): Promise<ChungTu> {
    const result = await this.put<ChungTuResponse>(dto, { endpoint: `/../chung-tu/${id}` });
    return mapChungTu(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/../chung-tu/${id}` });
  }

  async search(keyword: string): Promise<ChungTu[]> {
    const data = await this.get<ChungTuResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map(mapChungTu);
  }

  async getStats(params?: PhieuQueryParams): Promise<PhieuStats> {
    return this.get<PhieuStats>({ endpoint: '/stats', params });
  }

  async getSummary(type: PhieuSummaryType, params?: PhieuQueryParams): Promise<PhieuSummaryItem[]> {
    return this.get<PhieuSummaryItem[]>({ endpoint: `/summary/${type}`, params });
  }

  /** Dòng tiền theo tháng (hoặc theo tuần nếu có month) — thu=Nợ 111/112, chi=Có 111/112. */
  async getCashFlowSeries(year: number, month?: number): Promise<{ thang: number; thu: number; chi: number }[]> {
    const data = await this.get<{ thang: number; thu: number; chi: number }[]>({
      endpoint: '/../chung-tu/cash-flow-series',
      params: month ? { year, month } : { year },
    });
    return Array.isArray(data) ? data : [];
  }

  /** Tỷ trọng tiền thu/chi theo mã dòng tiền (phân loại theo Nợ/Có 111/112). */
  async getCashFlowComposition(
    which: 'thu' | 'chi',
    params?: PhieuQueryParams,
  ): Promise<CashFlowCompositionItem[]> {
    const data = await this.get<CashFlowCompositionItem[]>({
      endpoint: '/../chung-tu/cash-flow-composition',
      params: { ...params, which },
    });
    return Array.isArray(data) ? data : [];
  }

  async import(items: CreatePhieuDto[]): Promise<ChungTu[]> {
    const result = await this.post<ChungTuResponse[]>(items, { endpoint: '/import' });
    return result.map(mapChungTu);
  }
}

export const phieuThuService = new PhieuService('PHIEU_THU', '/voucher/phieu-thu');
export const phieuChiService = new PhieuService('PHIEU_CHI', '/voucher/phieu-chi');
