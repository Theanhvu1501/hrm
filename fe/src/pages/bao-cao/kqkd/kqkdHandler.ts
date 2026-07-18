import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface KqkdEvents extends BaseEvents {}

export interface KqkdStates extends BaseStates {}

export class KqkdHandler extends CHanlder<KqkdEvents, KqkdStates> {
  constructor() {
    super("kqkd");
  }
}
