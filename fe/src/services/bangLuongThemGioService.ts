import { ServiceBase } from './base/service-base';

/** Một nhóm cột trên mẫu 03-LĐTL: Số giờ + Thành tiền của một loại ngày. */
export interface DongThemGioTheoLoai {
  soGio: number;
  heSo: number;
  thanhTien: number;
}

/** Mirror `DongLuongThemGio` (be/libs/entities/src/luong/dong-luong-them-gio.entity.ts). */
export interface DongLuongThemGio {
  id: string;
  thang: string; // 'YYYY-MM'
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  luongThang: number;
  congChuan: number;
  soGioMoiNgay: number;
  donGiaNgay: number;
  donGiaGio: number;
  theoLoai: Record<string, DongThemGioTheoLoai>;
  tongTien: number;
  gioNghiBu: number;
  tienNghiBu: number;
  thucNhan: number;
  gioOtHetHan: number;
  suaTay: boolean;
  trangThai: string; // nhap|chot
}

/** Sửa SỐ GIỜ từng loại, không sửa thẳng thành tiền — xem DTO phía backend. */
export interface CapNhatDongThemGioDto {
  theoLoai?: Record<string, number>;
  gioNghiBu?: number;
}

class BangLuongThemGioService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/bang-luong-them-gio' });
  }

  async danhSach(thang: string): Promise<DongLuongThemGio[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: { thang },
    });
    return res.map(this.transform);
  }

  async tongHop(thang: string): Promise<DongLuongThemGio[]> {
    const res = await super.post<Array<Record<string, unknown>>>(
      { thang },
      { endpoint: '/tong-hop' },
    );
    return res.map(this.transform);
  }

  async capNhatDong(
    id: string,
    dto: CapNhatDongThemGioDto,
  ): Promise<DongLuongThemGio> {
    const res = await super.patch<Record<string, unknown>>(dto, {
      endpoint: `/${id}`,
    });
    return this.transform(res);
  }

  /**
   * Backend trả `{ soDong }` chứ không trả danh sách (khác `bangLuongService`),
   * nên nơi gọi phải tải lại danh sách sau khi chốt. Cố ý không "tiện tay" trả
   * luôn danh sách ở backend: chốt kỳ là thao tác đổi trạng thái, còn danh
   * sách là truy vấn — gộp hai thứ làm một là chỗ dễ trả về dữ liệu cũ.
   */
  async chot(thang: string): Promise<{ soDong: number }> {
    return super.post<{ soDong: number }>({ thang }, { endpoint: '/chot' });
  }

  async moLai(thang: string): Promise<{ soDong: number }> {
    return super.post<{ soDong: number }>({ thang }, { endpoint: '/mo-lai' });
  }

  private transform(x: Record<string, unknown>): DongLuongThemGio {
    return {
      id: (x._id as string) || (x.id as string),
      thang: x.thang as string,
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      luongThang: (x.luongThang as number) ?? 0,
      congChuan: (x.congChuan as number) ?? 0,
      soGioMoiNgay: (x.soGioMoiNgay as number) ?? 0,
      donGiaNgay: (x.donGiaNgay as number) ?? 0,
      donGiaGio: (x.donGiaGio as number) ?? 0,
      theoLoai:
        (x.theoLoai as Record<string, DongThemGioTheoLoai>) ?? {},
      tongTien: (x.tongTien as number) ?? 0,
      gioNghiBu: (x.gioNghiBu as number) ?? 0,
      tienNghiBu: (x.tienNghiBu as number) ?? 0,
      thucNhan: (x.thucNhan as number) ?? 0,
      gioOtHetHan: (x.gioOtHetHan as number) ?? 0,
      suaTay: (x.suaTay as boolean) ?? false,
      trangThai: (x.trangThai as string) ?? 'nhap',
    };
  }
}

export const bangLuongThemGioService = new BangLuongThemGioService();
