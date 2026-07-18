import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { NhatKyChung } from "@/types";
import "./view.event";
import "./view.state";
import { NhatKyChungStates, NhatKyChungEvents } from "../../../handler/nhat-ky-chung.handler";

@RegisterHandler("nhat-ky-chung")
export class ViewHandler extends CSubHanlder<NhatKyChungEvents, NhatKyChungStates> {
  @HandlerDecorator("openViewModal")
  async openViewModal(params: { entry: NhatKyChung }): Promise<void> {
    this.setState("viewingEntry", params.entry);
    this.setState("viewModalVisible", true);
  }

  @HandlerDecorator("closeViewModal")
  async closeViewModal(): Promise<void> {
    this.setState("viewModalVisible", false);
    this.setState("viewingEntry", null);
  }
}
