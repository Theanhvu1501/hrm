import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface BangThemGioEvents {}
export interface BangThemGioStates extends BaseStates {}

export class BangThemGioHandler extends CHanlder<
  BangThemGioEvents,
  BangThemGioStates
> {
  constructor() {
    super("bang-luong-them-gio-context");
  }
}
