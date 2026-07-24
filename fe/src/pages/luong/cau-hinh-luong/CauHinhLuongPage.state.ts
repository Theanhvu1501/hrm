import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { CauHinhLuong } from "@/services/cauHinhLuongService";

// State dùng chung cho toàn màn (đọc/ghi ở cả Page và 3 editor con).
export interface CauHinhLuongPageStates extends BaseStates {
  cauHinh: CauHinhLuong | null;
  dangTai: boolean;
  dangLuu: boolean;
}

declare module "./cauHinhLuongHandler" {
  interface CauHinhLuongStates extends CauHinhLuongPageStates {}
}
