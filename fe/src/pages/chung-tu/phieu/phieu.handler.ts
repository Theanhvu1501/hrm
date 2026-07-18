import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./handler/sub-handler";

export interface PhieuEvents extends BaseEvents {}
export interface PhieuStates extends BaseStates {}

export class PhieuHandler extends CHanlder<PhieuEvents, PhieuStates> {
  constructor() {
    super("phieu");
  }
}
