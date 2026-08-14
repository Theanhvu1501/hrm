export interface KyHieuDef {
  kyHieu: string;
  nhan: string;
  soCong: number;
  nhom:
    | 'lam_viec'
    | 'nghi_huong_luong'
    | 'nghi_khong_luong'
    | 'om_bhxh'
    /**
     * Ngày vốn không phải ngày làm việc (nghỉ theo lịch tuần). Nhóm RIÊNG,
     * không gộp vào `nghi_khong_luong`: nghỉ không lương là ngày lẽ ra phải
     * đi làm mà người ta xin nghỉ, còn đây là ngày công ty không yêu cầu ai
     * đi làm. Gộp lại là thống kê "ngày nghỉ không lương" của mọi nhân viên
     * phồng lên bằng số cuối tuần trong tháng.
     */
    | 'ngay_nghi';
}

export const KY_HIEU_CHAM_CONG: KyHieuDef[] = [
  { kyHieu: 'X', nhan: 'Làm đủ ngày', soCong: 1, nhom: 'lam_viec' },
  { kyHieu: '1/2', nhan: 'Làm nửa ngày', soCong: 0.5, nhom: 'lam_viec' },
  { kyHieu: 'P', nhan: 'Nghỉ phép', soCong: 1, nhom: 'nghi_huong_luong' },
  { kyHieu: 'L', nhan: 'Nghỉ lễ/Tết', soCong: 1, nhom: 'nghi_huong_luong' },
  { kyHieu: 'NB', nhan: 'Nghỉ bù', soCong: 1, nhom: 'nghi_huong_luong' },
  { kyHieu: 'CT', nhan: 'Công tác', soCong: 1, nhom: 'lam_viec' },
  /**
   * Làm việc online (ở nhà) theo đơn `lam_online` đã duyệt.
   *
   * 1 công như `X` nên lương chính và phép năm theo công thực tế
   * (`quy-phep.service.ts` đọc `soNgayCong`) không đổi. Nhưng cố ý là một ký
   * hiệu RIÊNG chứ không phải `X`: `demNgayLamDu()` bên bảng lương chỉ đếm ô
   * `X` để ra số suất ăn ca, nên tách ký hiệu chính là cách ngày online không
   * được tính tiền ăn trưa — chủ sản phẩm chốt 2026-08-14.
   *
   * Nửa buổi online dùng CHUNG ký hiệu này: nửa buổi vẫn là làm cả ngày (chỉ
   * khác chỗ ngồi) nên vẫn 1 công, và cũng không có suất ăn. Thêm một ký hiệu
   * nửa buổi riêng chỉ để hiển thị là bắt mọi nơi tính tiền học thuộc thêm
   * một ngoại lệ mà không đổi một đồng nào — buổi đã nằm trên đơn rồi.
   */
  { kyHieu: 'OL', nhan: 'Làm online', soCong: 1, nhom: 'lam_viec' },
  { kyHieu: 'O', nhan: 'Nghỉ ốm (BHXH)', soCong: 0, nhom: 'om_bhxh' },
  {
    kyHieu: 'KL',
    nhan: 'Nghỉ không lương',
    soCong: 0,
    nhom: 'nghi_khong_luong',
  },
  { kyHieu: 'N', nhan: 'Ngày nghỉ theo lịch', soCong: 0, nhom: 'ngay_nghi' },
];

export function soCongCuaKyHieu(k?: string): number {
  const d = KY_HIEU_CHAM_CONG.find((x) => x.kyHieu === k);
  return d ? d.soCong : 0;
}

/**
 * Nguồn của một ô bảng công.
 *
 * `tu_dong` = máy suy ra, lần tổng hợp sau được phép tính lại và ghi đè.
 * `hr_sua`  = người đã chạm vào, máy KHÔNG bao giờ được đụng nữa.
 */
export const NGUON_O = {
  TU_DONG: 'tu_dong',
  HR_SUA: 'hr_sua',
} as const;

/**
 * Ô thiếu `nguon` là dữ liệu có TRƯỚC khi có tự sinh — toàn bộ đều do HR tick
 * tay. Mặc định phải là `hr_sua`: hiểu ngược lại thì lần tổng hợp đầu tiên sau
 * khi deploy sẽ xoá sạch công sức nhập liệu của nhiều tháng đã chốt.
 */
export function nguonCuaO(o: { nguon?: string }): string {
  return o.nguon === NGUON_O.TU_DONG ? NGUON_O.TU_DONG : NGUON_O.HR_SUA;
}
