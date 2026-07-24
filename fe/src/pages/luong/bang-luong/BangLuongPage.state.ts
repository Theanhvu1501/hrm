import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { DongLuong } from "@/services/bangLuongService";
import { KhoanLuong } from "@/services/cauHinhLuongService";

// State dùng chung cho toàn màn (đọc/ghi ở cả Page, ThanhKy và BangLuongTable).
export interface BangLuongPageStates extends BaseStates {
  thang: string;
  danhSach: DongLuong[];
  dangTai: boolean;
  dangTongHop: boolean;
  tabDangXem: "khaiBao" | "thucTe";
  daChot: boolean;
  /**
   * Danh mục khoản lương từ Cấu hình lương (tải best-effort ở init) — dùng
   * để BangLuongTable biết khoản nào NHAP_THEO_KY (cho sửa) và tên hiển thị
   * (`ten`) thay vì mã thô. Rỗng khi tải cấu hình lỗi — table fallback về
   * hành vi cũ (xem BangLuongTable.tsx), không throw.
   */
  khoanLuong: KhoanLuong[];
}

declare module "./bangLuongHandler" {
  interface BangLuongStates extends BangLuongPageStates {}
}
