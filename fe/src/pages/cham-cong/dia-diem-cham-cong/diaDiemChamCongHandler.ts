import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface DiaDiemChamCongEvents {}
export interface DiaDiemChamCongStates extends BaseStates {}

export class DiaDiemChamCongHandler extends CHanlder<
  DiaDiemChamCongEvents,
  DiaDiemChamCongStates
> {
  constructor() {
    super("dia-diem-cham-cong-context");
  }
}
