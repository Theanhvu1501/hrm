import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { DongLuongThemGio } from "@/services/bangLuongThemGioService";

export interface BangThemGioPageStates extends BaseStates {
  thang: string;
  danhSach: DongLuongThemGio[];
  dangTai: boolean;
  dangTongHop: boolean;
  daChot: boolean;
}

declare module "./bangLuongThemGioHandler" {
  interface BangThemGioStates extends BangThemGioPageStates {}
}
