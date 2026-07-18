import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface NhomQuanLyEvents extends BaseEvents {}

export interface NhomQuanLyStates extends BaseStates {}

export class NhomQuanLyHandler extends CHanlder<NhomQuanLyEvents, NhomQuanLyStates> {
  constructor() {
    super("nhom-quan-ly");
  }
}
