import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface NhatKyChungEvents extends BaseEvents {}

export interface NhatKyChungStates extends BaseStates {}

export class NhatKyChungHandler extends CHanlder<NhatKyChungEvents, NhatKyChungStates> {
  constructor() {
    super("nhat-ky-chung");
  }
}
