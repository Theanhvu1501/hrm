import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface ThietBiEvents {}
export interface ThietBiStates extends BaseStates {}

export class ThietBiHandler extends CHanlder<ThietBiEvents, ThietBiStates> {
  constructor() {
    super("thiet-bi-context");
  }
}
