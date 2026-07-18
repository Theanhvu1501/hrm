import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { attendanceLocationService } from "@/services/attendanceLocationService";
import "./init.event";

@RegisterHandler("dia-diem-cham-cong-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    this.setState("formVisible", false);
    this.setState("editingLocation", null);
    this.setState("saving", false);

    try {
      const locationList = await attendanceLocationService.getList();
      this.setState("locationList", locationList);
    } catch (error) {
      console.error("Init dia diem cham cong error:", error);
      this.setState("locationList", []);
    }

    this.setState("loading", false);
  }
}
