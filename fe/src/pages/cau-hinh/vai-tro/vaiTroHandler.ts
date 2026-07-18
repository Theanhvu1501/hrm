import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface VaiTroEvents {}
export interface VaiTroStates extends BaseStates {}

export class VaiTroHandler extends CHanlder<VaiTroEvents, VaiTroStates> {
  constructor() {
    super("vai-tro-context");
  }
}
