// fe/src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.ts
import { DoiTuong, TaiKhoanNganHang } from "@/types";

export interface DoiTuongSelectConfig {
  disabled: boolean;
  options: Array<{ value: string; label: string }>;
}

/**
 * Nguồn dropdown Đối tượng theo chiTietTheo của TK:
 * - NGAN_HANG_QUY → danh mục ngân hàng & quỹ
 * - 4 loại còn lại → đối tượng đúng loại đó
 * - TK không khai chiTietTheo → khoá ô (không cần nhập đối tượng)
 */
export function getDoiTuongSelectConfig(
  chiTietTheo: string | undefined,
  doiTuongList: DoiTuong[],
  nganHangList: TaiKhoanNganHang[],
): DoiTuongSelectConfig {
  if (!chiTietTheo) {
    return { disabled: true, options: [] };
  }
  if (chiTietTheo === "NGAN_HANG_QUY") {
    return {
      disabled: false,
      options: nganHangList.map((nh) => ({
        value: nh.id,
        label: `${nh.ma} - ${nh.ten}`,
      })),
    };
  }
  return {
    disabled: false,
    options: doiTuongList
      .filter((d) => d.loai.includes(chiTietTheo as DoiTuong["loai"][number]))
      .map((d) => ({ value: d.id, label: `${d.ma} - ${d.ten}` })),
  };
}

/**
 * Các loại của đối tượng đang chọn (đối tượng có thể đa loại);
 * ngân hàng/quỹ quy về [NGAN_HANG_QUY]. Undefined nếu không tìm thấy.
 */
export function getSelectedDoiTuongLoai(
  id: string | undefined,
  doiTuongList: DoiTuong[],
  nganHangList: TaiKhoanNganHang[],
): string[] | undefined {
  if (!id) return undefined;
  const dt = doiTuongList.find((d) => d.id === id);
  if (dt) return dt.loai;
  if (nganHangList.some((nh) => nh.id === id)) return ["NGAN_HANG_QUY"];
  return undefined;
}
