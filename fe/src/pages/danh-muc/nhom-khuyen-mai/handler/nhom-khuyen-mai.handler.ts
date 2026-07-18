import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface NhomKhuyenMaiEvents extends BaseEvents {}

export interface NhomKhuyenMaiStates extends BaseStates {}

export class NhomKhuyenMaiHandler extends CHanlder<NhomKhuyenMaiEvents, NhomKhuyenMaiStates> {
  constructor() {
    super("nhom-khuyen-mai");
  }
}
