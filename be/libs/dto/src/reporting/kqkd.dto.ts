export interface KqkdChiTieu {
  ma: string; // Mã số: '01', '02', '10', etc.
  ten: string; // Tên chỉ tiêu
  kyHienTai: number;
  phanTramDTThuan: number | null; // % so với DT thuần
  tyTrongChiPhi: number | null; // Tỷ trọng CP (chỉ cho mã 22, 25, 26)
  kyTruoc: number;
  phanTramDTThuanKyTruoc: number | null;
  tyTrongChiPhiKyTruoc: number | null;
  bienDong: number;
  phanTramBienDong: number | null;
  isCalculated: boolean; // true = chỉ tiêu tính toán, false = chỉ tiêu gốc từ TK
  isBold: boolean; // true = dòng tổng/subtotal cần bold
}

export interface KqkdReport {
  chiTieu: KqkdChiTieu[];
  kyHienTai: { startDate: string; endDate: string };
  kyTruoc: { startDate: string; endDate: string };
}

export interface KqkdQueryParams {
  startDate: string;
  endDate: string;
  periodType: 'thang' | 'quy' | 'nam' | 'tuyChon';
}
