import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface QuyGioEvents {}
export interface QuyGioStates extends BaseStates {}

export class QuyGioHandler extends CHanlder<QuyGioEvents, QuyGioStates> {
  constructor() {
    super("quy-gio-context");
  }
}
