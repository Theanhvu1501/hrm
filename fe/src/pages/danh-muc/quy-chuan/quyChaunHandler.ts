import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface QuyChaunEvents extends BaseEvents {}

export interface QuyChaunStates extends BaseStates {}

export class QuyChaunHandler extends CHanlder<QuyChaunEvents, QuyChaunStates> {
  constructor() {
    super("quy-chuan-context");
  }
}
