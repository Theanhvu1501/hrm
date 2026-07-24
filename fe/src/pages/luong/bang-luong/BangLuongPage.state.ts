import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { DongLuong } from "@/services/bangLuongService";

// State dùng chung cho toàn màn (đọc/ghi ở cả Page, ThanhKy và BangLuongTable).
export interface BangLuongPageStates extends BaseStates {
  thang: string;
  danhSach: DongLuong[];
  dangTai: boolean;
  dangTongHop: boolean;
  tabDangXem: "khaiBao" | "thucTe";
  daChot: boolean;
}

declare module "./bangLuongHandler" {
  interface BangLuongStates extends BangLuongPageStates {}
}
