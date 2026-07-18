import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { workShiftService } from "@/services/workShiftService";
import "./init.event";

@RegisterHandler("ca-lam-viec-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    this.setState("formVisible", false);
    this.setState("editingShift", null);
    this.setState("saving", false);

    try {
      const shiftList = await workShiftService.getList();
      this.setState("shiftList", shiftList);
    } catch (error) {
      console.error("Init ca lam viec error:", error);
      this.setState("shiftList", []);
    }

    this.setState("loading", false);
  }
}
