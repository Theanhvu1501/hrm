import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface QuyPhepEvents {}
export interface QuyPhepStates extends BaseStates {}

export class QuyPhepHandler extends CHanlder<QuyPhepEvents, QuyPhepStates> {
  constructor() {
    super("quy-phep-context");
  }
}
