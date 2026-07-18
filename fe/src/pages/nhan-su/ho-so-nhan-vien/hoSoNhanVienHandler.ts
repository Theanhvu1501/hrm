import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface HoSoNhanVienEvents {}
export interface HoSoNhanVienStates extends BaseStates {}

export class HoSoNhanVienHandler extends CHanlder<
  HoSoNhanVienEvents,
  HoSoNhanVienStates
> {
  constructor() {
    super("ho-so-nhan-vien-context");
  }
}
