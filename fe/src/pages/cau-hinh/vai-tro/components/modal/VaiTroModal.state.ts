import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { VaiTroItem } from "../table/VaiTroTable.state";

export interface ModalStates extends BaseStates {
  modalVisible: boolean;
  editingRecord: VaiTroItem | null;
}

declare module "../../vaiTroHandler" {
  interface VaiTroStates extends ModalStates {}
}
