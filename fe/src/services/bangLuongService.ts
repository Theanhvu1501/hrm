import { ServiceBase } from './base/service-base';
import type { CanCuBHXH } from './cauHinhLuongService';

export interface KetQuaLuong {
  giaTriTungKhoan: Record<string, number>;
  tongThuNhap: number;
  thuNhapMienThue: number;
  bhxh: number;
  giamTru: number;
  thuNhapTinhThue: number;
  thue: number;
  thucLinh: number;
  /** Dòng chốt trước P4.1 không có 2 trường này → đọc `?? 0`. */
  chiPhiBHCongTy?: number;
  tongChiPhiCongTy?: number;
  /** Dòng chốt trước P4.2c-2 không có 3 trường này → đọc `?? 0`. */
  phiCongDoan?: number;
  mienThueKhoan?: number;
  otMienThue?: number;
}

/** Mirror `DongLuong` entity (be/libs/entities/src/luong/dong-luong.entity.ts). */
export interface DongLuong {
  id: string;
  thang: string; // 'YYYY-MM'
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  congThuong: number;
  congThuViec: number;
  congKhac: number;
  luongThoaThuan: number;
  mucKhaiBao: number;
  phuCapCoDinh: number;
  soNguoiPhuThuoc: number;
  dongBH: boolean;
  thoiVu: boolean;
  camKet: boolean;
  hopDongThu2: boolean;
  /** Cấu hình đã resolve lúc tổng hợp — dòng trước P4.1 không có. */
  cauHinhApDung?: {
    congChuan: number;
    thuViecTyLe: number;
    bhxhTyLe: number;
    bhxhCanCu: CanCuBHXH;
  };
  tamUng: number;
  khauTruKhac: number;
  nhapTheoKy: Record<string, number>;
  khaiBao: KetQuaLuong;
  thucTe: KetQuaLuong;
  trangThai: string; // nhap|chot
}

export type CapNhatDongLuongDto = Partial<
  Pick<DongLuong, 'nhapTheoKy' | 'tamUng' | 'khauTruKhac'>
>;


/** Một dòng bảng tổng hợp trích nộp BHXH (yêu cầu d33). */
export interface DongBaoHiem {
  stt: number;
  employeeId: string;
  maNhanVien: string;
  hoTen: string;
  mucDong: number;
  omDauThaiSan: number;
  huuTriTuTuat: number;
  bhyt: number;
  bhtn: number;
  tnldBnn: number;
  cong: number;
  nld: number;
  dn: number;
}

/** Một dòng danh sách phí công đoàn theo kỳ (yêu cầu d35). */
export interface DongCongDoan {
  stt: number;
  employeeId: string;
  maNhanVien: string;
  hoTen: string;
  mucDong: number;
  tyLe: number;
  soTien: number;
}

/** Một dòng bảng thuế TNCN theo kỳ tự chọn (yêu cầu d34). */
export interface DongThueTheoKy {
  stt: number;
  employeeId: string;
  maNhanVien: string;
  hoTen: string;
  soKy: number;
  tongThuNhap: number;
  bhxh: number;
  mienThue: number;
  giamTruGiaCanh: number;
  thuNhapTinhThue: number;
  thue: number;
}

class BangLuongService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/bang-luong' });
  }

  async danhSach(thang: string): Promise<DongLuong[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: { thang },
    });
    return res.map(this.transform);
  }

  async tongHop(thang: string): Promise<DongLuong[]> {
    const res = await super.post<Array<Record<string, unknown>>>(
      { thang },
      { endpoint: '/tong-hop' }
    );
    return res.map(this.transform);
  }

  async capNhatDong(id: string, dto: CapNhatDongLuongDto): Promise<DongLuong> {
    const res = await super.patch<Record<string, unknown>>(dto, {
      endpoint: `/${id}`,
    });
    return this.transform(res);
  }

  /**
   * Import số nhập tay theo kỳ. Trả BÁO CÁO từng dòng — dòng hỏng không chặn
   * dòng lành, nên phải đọc `loi` chứ không chỉ nhìn `soDongGhi`.
   */
  async importNhapTheoKy(
    thang: string,
    dong: Array<{ maNhanVien: string; giaTri: Record<string, number> }>,
  ): Promise<{ soDongGhi: number; loi: Array<{ maNhanVien: string; lyDo: string }> }> {
    return this.post<{
      soDongGhi: number;
      loi: Array<{ maNhanVien: string; lyDo: string }>;
    }>({ thang, dong }, { endpoint: '/import-nhap-theo-ky' });
  }

  async chot(thang: string): Promise<DongLuong[]> {
    const res = await super.post<Array<Record<string, unknown>>>(
      { thang },
      { endpoint: '/chot' }
    );
    return res.map(this.transform);
  }

  async moLai(thang: string): Promise<DongLuong[]> {
    const res = await super.post<Array<Record<string, unknown>>>(
      { thang },
      { endpoint: '/mo-lai' }
    );
    return res.map(this.transform);
  }

  private transform(x: Record<string, unknown>): DongLuong {
    return {
      id: (x._id as string) || (x.id as string),
      thang: x.thang as string,
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      congThuong: (x.congThuong as number) ?? 0,
      congThuViec: (x.congThuViec as number) ?? 0,
      congKhac: (x.congKhac as number) ?? 0,
      luongThoaThuan: (x.luongThoaThuan as number) ?? 0,
      mucKhaiBao: (x.mucKhaiBao as number) ?? 0,
      phuCapCoDinh: (x.phuCapCoDinh as number) ?? 0,
      soNguoiPhuThuoc: (x.soNguoiPhuThuoc as number) ?? 0,
      dongBH: (x.dongBH as boolean) ?? false,
      thoiVu: (x.thoiVu as boolean) ?? false,
      camKet: (x.camKet as boolean) ?? false,
      hopDongThu2: (x.hopDongThu2 as boolean) ?? false,
      cauHinhApDung:
        (x.cauHinhApDung as DongLuong['cauHinhApDung']) ?? undefined,
      tamUng: (x.tamUng as number) ?? 0,
      khauTruKhac: (x.khauTruKhac as number) ?? 0,
      nhapTheoKy: (x.nhapTheoKy as Record<string, number>) ?? {},
      khaiBao: x.khaiBao as KetQuaLuong,
      thucTe: x.thucTe as KetQuaLuong,
      trangThai: (x.trangThai as string) ?? 'nhap',
    };
  }
  /** Bảng tổng hợp trích nộp BHXH của một tháng (yêu cầu d33). */
  bangBaoHiem(thang: string): Promise<DongBaoHiem[]> {
    return this.get<DongBaoHiem[]>({
      endpoint: '/bao-hiem',
      params: { thang },
    });
  }

  /** Danh sách phí công đoàn theo kỳ tự chọn (yêu cầu d35). */
  bangCongDoan(tuThang: string, denThang: string): Promise<DongCongDoan[]> {
    return this.get<DongCongDoan[]>({
      endpoint: '/cong-doan',
      params: { tuThang, denThang },
    });
  }

  /** Bảng thuế TNCN theo kỳ tự chọn (yêu cầu d34). */
  bangThueTheoKy(
    tuThang: string,
    denThang: string,
    muc: 'khaiBao' | 'thucTe' = 'khaiBao',
  ): Promise<DongThueTheoKy[]> {
    return this.get<DongThueTheoKy[]>({
      endpoint: '/thue-theo-ky',
      params: { tuThang, denThang, muc },
    });
  }

  /** Gửi phiếu lương của kỳ cho người lao động (yêu cầu d36). */
  guiPhieuLuong(thang: string): Promise<{ soPhieu: number; boQua: number }> {
    return this.post<{ soPhieu: number; boQua: number }>(
      { thang },
      { endpoint: '/gui-phieu' },
    );
  }

}

export const bangLuongService = new BangLuongService();
