import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface HopDongEvents extends BaseEvents {}

export interface HopDongStates extends BaseStates {}

export class HopDongHandler extends CHanlder<HopDongEvents, HopDongStates> {
  constructor() {
    super("hop-dong");
  }
}
