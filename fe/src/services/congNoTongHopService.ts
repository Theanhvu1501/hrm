import { ServiceBase } from './base/service-base';

export interface CongNoCell {
  phaiThu: number;
  phaiTra: number;
}

export interface CongNoRowVal {
  dauKy: CongNoCell;
  phatSinh: CongNoCell;
  cuoiKy: CongNoCell;
}

export interface CongNoDoiTuongRow extends CongNoRowVal {
  ma: string;
  ten: string;
}

export interface CongNoAccount extends CongNoRowVal {
  ma: string;
  ten: string;
  doiTuongs: CongNoDoiTuongRow[];
}

export interface BangTongHopCongNo {
  accounts: CongNoAccount[];
  totals: CongNoRowVal;
}

export interface GetCongNoParams {
  startDate: string;
  endDate: string;
  maTaiKhoan?: string;
  maDoiTuong?: string;
}

class CongNoTongHopService extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/bao-cao' });
  }

  async getReport(params: GetCongNoParams): Promise<BangTongHopCongNo> {
    const query: Record<string, string> = {
      startDate: params.startDate,
      endDate: params.endDate,
    };
    if (params.maTaiKhoan) query.maTaiKhoan = params.maTaiKhoan;
    if (params.maDoiTuong) query.maDoiTuong = params.maDoiTuong;

    return this.get<BangTongHopCongNo>({
      endpoint: '/bang-tong-hop-cong-no',
      params: query,
    });
  }
}

export const congNoTongHopService = new CongNoTongHopService();
