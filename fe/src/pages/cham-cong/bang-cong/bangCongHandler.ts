import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface BangCongEvents {}
export interface BangCongStates extends BaseStates {}

export class BangCongHandler extends CHanlder<BangCongEvents, BangCongStates> {
  constructor() {
    super("bang-cong-context");
  }
}
