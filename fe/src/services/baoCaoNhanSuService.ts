import { ServiceBase } from './base/service-base';

/** Chỉ số của một kỳ — chỉ gồm những thứ hệ thống ĐÃ có nguồn để tính. */
export interface ChiSoThang {
  ky: string;
  tongNhanSu: number;
  vaoMoi: number;
  nghiViec: number;
  nghiSom: number;
  luotThangTien: number;
  /** `null` = chưa tổng hợp bảng công tháng đó (khác hẳn 0%). */
  tyLeVangMat: number | null;
  gioLamThem: number | null;
}

/** Báo cáo tình hình sử dụng lao động (mẫu 01/PLI, nộp 6 tháng một lần). */
export interface SuDungLaoDong {
  tuNgay: string;
  denNgay: string;
  tongLaoDong: number;
  nu: number;
  nam: number;
  theoLoaiHopDong: Record<string, number>;
  theoPhongBan: Record<string, number>;
  tangTrongKy: number;
  giamTrongKy: number;
  duoiViThanhNien: number;
  caoTuoi: number;
}

class BaoCaoNhanSuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/bao-cao-nhan-su' });
  }

  /** Kỳ đang xem + 5 kỳ liền trước, để vẽ được xu hướng bằng một lần gọi. */
  chiSo(ky: string): Promise<ChiSoThang[]> {
    return this.get<ChiSoThang[]>({ endpoint: '/chi-so', params: { ky } });
  }

  suDungLaoDong(tuNgay: string, denNgay: string): Promise<SuDungLaoDong> {
    return this.get<SuDungLaoDong>({
      endpoint: '/su-dung-lao-dong',
      params: { tuNgay, denNgay },
    });
  }
}

export const baoCaoNhanSuService = new BaoCaoNhanSuService();
