import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface ChamCongCuaToiEvents {}
export interface ChamCongCuaToiStates extends BaseStates {}

export class ChamCongCuaToiHandler extends CHanlder<
  ChamCongCuaToiEvents,
  ChamCongCuaToiStates
> {
  constructor() {
    super("cham-cong-cua-toi-context");
  }
}
