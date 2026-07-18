import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { employeeService } from "@/services/employeeService";
import "./init.event";

@RegisterHandler("ho-so-nhan-vien-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    this.setState("formVisible", false);
    this.setState("editingEmployee", null);
    this.setState("saving", false);

    try {
      const employeeList = await employeeService.getList();
      this.setState("employeeList", employeeList);
    } catch (error) {
      console.error("Init ho so nhan vien error:", error);
      this.setState("employeeList", []);
    }

    this.setState("loading", false);
  }
}
