import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface NgayLeEvents {}
export interface NgayLeStates extends BaseStates {}

export class NgayLeHandler extends CHanlder<NgayLeEvents, NgayLeStates> {
  constructor() {
    super("ngay-le-context");
  }
}
