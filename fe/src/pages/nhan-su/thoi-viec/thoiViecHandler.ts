import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface ThoiViecEvents {}
export interface ThoiViecStates extends BaseStates {}

export class ThoiViecHandler extends CHanlder<ThoiViecEvents, ThoiViecStates> {
  constructor() {
    super("thoi-viec-context");
  }
}
