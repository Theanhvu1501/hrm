import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface BanGhiEvents {}
export interface BanGhiStates extends BaseStates {}

export class BanGhiHandler extends CHanlder<BanGhiEvents, BanGhiStates> {
  constructor() {
    super("ban-ghi-context");
  }
}
