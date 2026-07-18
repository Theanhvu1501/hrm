import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface PhanQuyenEvents {}
export interface PhanQuyenStates extends BaseStates {}

export class PhanQuyenHandler extends CHanlder<PhanQuyenEvents, PhanQuyenStates> {
  constructor() {
    super("phan-quyen-context");
  }
}
