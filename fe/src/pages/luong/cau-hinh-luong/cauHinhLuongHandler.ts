import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface CauHinhLuongEvents {}
export interface CauHinhLuongStates extends BaseStates {}

export class CauHinhLuongHandler extends CHanlder<
  CauHinhLuongEvents,
  CauHinhLuongStates
> {
  constructor() {
    super("cau-hinh-luong-context");
  }
}
