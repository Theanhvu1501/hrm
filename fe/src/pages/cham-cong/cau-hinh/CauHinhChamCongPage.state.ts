import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { CauHinhChamCong } from "@/services/cauHinhChamCongService";

export interface CauHinhChamCongPageStates extends BaseStates {
  cauHinh: CauHinhChamCong | null;
  dangTai: boolean;
  dangLuu: boolean;
}

declare module "./cauHinhChamCongHandler" {
  interface CauHinhChamCongStates extends CauHinhChamCongPageStates {}
}
