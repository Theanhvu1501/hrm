import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStates } from "../../../phieu.handler";
import { DeleteEvent } from "./delete.event";
import "./delete.event";

@RegisterHandler("phieu")
export class DeleteHandler extends CSubHanlder<DeleteEvent, PhieuStates> {
  @HandlerDecorator("deletePhieu")
  async deletePhieu(params: { id: string }): Promise<boolean> {
    const config = this.getState("config") as PhieuConfig | undefined;
    if (!config) return false;
    try {
      await config.service.remove(params.id);
    } catch (e) {
      console.error("Error deleting phieu:", e);
      return false;
    }
    try {
      await this.executeEvent("refresh", {});
    } catch (e) {
      console.error("Error refreshing after delete:", e);
    }
    return true;
  }
}
