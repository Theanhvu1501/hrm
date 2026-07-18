import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface CaLamViecEvents {}
export interface CaLamViecStates extends BaseStates {}

export class CaLamViecHandler extends CHanlder<CaLamViecEvents, CaLamViecStates> {
  constructor() {
    super("ca-lam-viec-context");
  }
}
