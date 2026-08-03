import { ServiceBase } from './base/service-base';

/** Một nhóm cột trên bảng quyết toán — dùng cho cả 4 quý lẫn cả năm. */
export interface KyQuyetToan {
  tongThuNhapChiuThue: number;
  bhxh: number;
  khoanMienThue: number;
  giamTruBanThan: number;
  giamTruNPT: number;
  giamTruGiaCanh: number;
  thuNhapTinhThue: number;
  thue: number;
}

export interface QuyetToanNguoi {
  employeeId: string;
  hoTen: string;
  maNhanVien: string;
  soKyDaChot: number;
  caNam: KyQuyetToan;
  quy: KyQuyetToan[];
  /** Σ thuế đã khấu trừ trong năm. */
  daKhauTru: number;
  /** `caNam.thue − daKhauTru`. Dương = nộp thêm, âm = được hoàn. */
  chenhLech: number;
  ghiChu?: string;
}

export interface KetQuaQuyetToan {
  nam: number;
  ds: QuyetToanNguoi[];
  /** Người không quyết toán theo lũy tiến (cam kết / thời vụ). */
  khongLuyTien: { employeeId: string; hoTen: string; lyDo: string }[];
  soKyDaChotTrongNam: number;
}

class QuyetToanTncnService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/bang-luong' });
  }

  async quyetToan(nam: number): Promise<KetQuaQuyetToan> {
    return super.get<KetQuaQuyetToan>({
      endpoint: '/quyet-toan-tncn',
      params: { nam },
    });
  }
}

export const quyetToanTncnService = new QuyetToanTncnService();
