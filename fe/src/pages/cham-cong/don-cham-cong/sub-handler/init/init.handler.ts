import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { attendanceRequestService } from "@/services/attendanceRequestService";
import { employeeService } from "@/services/employeeService";
import "./init.event";

@RegisterHandler("don-cham-cong-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    this.setState("formVisible", false);
    this.setState("editingRequest", null);
    this.setState("saving", false);

    try {
      const [requestList, employeeList] = await Promise.all([
        attendanceRequestService.getList(),
        employeeService.getList(),
      ]);
      this.setState("requestList", requestList);
      this.setState("employeeList", employeeList);
    } catch (error) {
      console.error("Init don cham cong error:", error);
      this.setState("requestList", []);
      this.setState("employeeList", []);
    }

    this.setState("loading", false);
  }
}
