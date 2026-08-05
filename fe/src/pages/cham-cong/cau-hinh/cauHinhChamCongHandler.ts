import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface CauHinhChamCongEvents {}
export interface CauHinhChamCongStates extends BaseStates {}

export class CauHinhChamCongHandler extends CHanlder<
  CauHinhChamCongEvents,
  CauHinhChamCongStates
> {
  constructor() {
    super("cau-hinh-cham-cong-context");
  }
}
