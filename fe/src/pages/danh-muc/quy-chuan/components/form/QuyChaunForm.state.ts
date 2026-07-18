import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { QuyChuan, HoSoChungTuRef } from "@/types";
import { LoaiChungTuType } from "@/services/loaiChungTuService";

export interface QuyChaunFormStates extends BaseStates {
  modalVisible: boolean;
  editingRecord: QuyChuan | null;
  formLoading: boolean;
  loaiChungTuList: LoaiChungTuType[];
  hoSoChungTuList: HoSoChungTuRef[];
}

declare module "../../quyChaunHandler" {
  interface QuyChaunStates extends QuyChaunFormStates {}
}
