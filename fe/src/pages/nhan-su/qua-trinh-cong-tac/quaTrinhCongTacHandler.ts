import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface QuaTrinhCongTacEvents {}
export interface QuaTrinhCongTacStates extends BaseStates {}

export class QuaTrinhCongTacHandler extends CHanlder<
  QuaTrinhCongTacEvents,
  QuaTrinhCongTacStates
> {
  constructor() {
    super("qua-trinh-cong-tac-context");
  }
}
