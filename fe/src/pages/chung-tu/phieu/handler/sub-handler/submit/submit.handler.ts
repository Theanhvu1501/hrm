import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStates } from "../../../phieu.handler";
import { CreatePhieuDto } from "@/services/phieuService";
import { SubmitEvent } from "./submit.event";
import "./submit.event";

@RegisterHandler("phieu")
export class SubmitHandler extends CSubHanlder<SubmitEvent, PhieuStates> {
  @HandlerDecorator("submitPhieu")
  async submitPhieu(params: { id?: string; dto: CreatePhieuDto }): Promise<boolean> {
    const config = this.getState("config") as PhieuConfig | undefined;
    if (!config) return false;
    try {
      if (params.id) {
        await config.service.update(params.id, params.dto);
      } else {
        await config.service.create(params.dto);
      }
    } catch (e) {
      console.error("Error submitting phieu:", e);
      return false;
    }
    try {
      await this.executeEvent("refresh", {});
    } catch (e) {
      console.error("Error refreshing after submit:", e);
    }
    return true;
  }
}
