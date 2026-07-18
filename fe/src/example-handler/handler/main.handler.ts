import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface MainEvents extends BaseEvents {}

export interface MainStates extends BaseStates {}

export class MainHandler extends CHanlder<MainEvents, MainStates> {
  constructor() {
    super("helloworld");
  }
}
