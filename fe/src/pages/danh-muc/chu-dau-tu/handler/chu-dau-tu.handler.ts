import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface ChuDauTuEvents extends BaseEvents {}

export interface ChuDauTuStates extends BaseStates {}

export class ChuDauTuHandler extends CHanlder<ChuDauTuEvents, ChuDauTuStates> {
  constructor() {
    super("chu-dau-tu");
  }
}
