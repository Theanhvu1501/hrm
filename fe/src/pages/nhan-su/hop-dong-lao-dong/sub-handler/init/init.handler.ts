import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { laborContractService } from "@/services/laborContractService";
import { employeeService } from "@/services/employeeService";
import "./init.event";

@RegisterHandler("hop-dong-lao-dong-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    this.setState("formVisible", false);
    this.setState("editingContract", null);
    this.setState("saving", false);

    try {
      const [contractList, employeeList] = await Promise.all([
        laborContractService.getList(),
        employeeService.getList(),
      ]);
      this.setState("contractList", contractList);
      this.setState("employeeList", employeeList);
    } catch (error) {
      console.error("Init hop dong lao dong error:", error);
      this.setState("contractList", []);
      this.setState("employeeList", []);
    }

    this.setState("loading", false);
  }
}
