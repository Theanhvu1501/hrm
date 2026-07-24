import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface DonTuCuaToiEvents {}
export interface DonTuCuaToiStates extends BaseStates {}

export class DonTuCuaToiHandler extends CHanlder<
  DonTuCuaToiEvents,
  DonTuCuaToiStates
> {
  constructor() {
    super("don-tu-cua-toi-context");
  }
}
