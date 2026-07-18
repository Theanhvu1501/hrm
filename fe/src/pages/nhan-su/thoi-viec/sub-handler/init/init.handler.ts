import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { resignationService } from "@/services/resignationService";
import { employeeService } from "@/services/employeeService";
import "./init.event";

@RegisterHandler("thoi-viec-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    this.setState("formVisible", false);
    this.setState("editingResignation", null);
    this.setState("saving", false);

    try {
      const [resignationList, employeeList] = await Promise.all([
        resignationService.getList(),
        employeeService.getList(),
      ]);
      this.setState("resignationList", resignationList);
      this.setState("employeeList", employeeList);
    } catch (error) {
      console.error("Init thoi viec error:", error);
      this.setState("resignationList", []);
      this.setState("employeeList", []);
    }

    this.setState("loading", false);
  }
}
