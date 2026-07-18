import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface DonChamCongEvents {}
export interface DonChamCongStates extends BaseStates {}

export class DonChamCongHandler extends CHanlder<
  DonChamCongEvents,
  DonChamCongStates
> {
  constructor() {
    super("don-cham-cong-context");
  }
}
