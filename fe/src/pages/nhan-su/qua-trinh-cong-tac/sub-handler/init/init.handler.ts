import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { employmentHistoryService } from "@/services/employmentHistoryService";
import { employeeService } from "@/services/employeeService";
import "./init.event";

@RegisterHandler("qua-trinh-cong-tac-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    this.setState("formVisible", false);
    this.setState("editingHistory", null);
    this.setState("saving", false);

    try {
      const [historyList, employeeList] = await Promise.all([
        employmentHistoryService.getList(),
        employeeService.getList(),
      ]);
      this.setState("historyList", historyList);
      this.setState("employeeList", employeeList);
    } catch (error) {
      console.error("Init qua trinh cong tac error:", error);
      this.setState("historyList", []);
      this.setState("employeeList", []);
    }

    this.setState("loading", false);
  }
}
