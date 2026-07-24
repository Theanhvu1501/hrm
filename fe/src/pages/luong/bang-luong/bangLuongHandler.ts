import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface BangLuongEvents {}
export interface BangLuongStates extends BaseStates {}

export class BangLuongHandler extends CHanlder<BangLuongEvents, BangLuongStates> {
  constructor() {
    super("bang-luong-context");
  }
}
