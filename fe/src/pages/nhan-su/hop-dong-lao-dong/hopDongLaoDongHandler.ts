import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface HopDongLaoDongEvents {}
export interface HopDongLaoDongStates extends BaseStates {}

export class HopDongLaoDongHandler extends CHanlder<
  HopDongLaoDongEvents,
  HopDongLaoDongStates
> {
  constructor() {
    super("hop-dong-lao-dong-context");
  }
}
