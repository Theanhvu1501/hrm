import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface NhatKyChungFormEvents extends BaseEvents {}

export interface NhatKyChungFormStates extends BaseStates {}

export class NhatKyChungFormHandler extends CHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  constructor() {
    super("nhat-ky-chung-form");
  }
}
