import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import dayjs from "dayjs";
import { timesheetService } from "@/services/timesheetService";
import "./init.event";

@RegisterHandler("bang-cong-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    const thang = dayjs().format("YYYY-MM");
    this.setState("thang", thang);
    this.setState("timesheetList", []);
    this.setState("kyHieuList", []);
    this.setState("loading", false);
    this.setState("generating", false);
    this.setState("finalizing", false);
    this.setState("reopening", false);

    await Promise.all([this.loadList(thang), this.loadKyHieu()]);
  }

  @HandlerDecorator("changeThang")
  async changeThang(params: { thang: string }): Promise<void> {
    this.setState("thang", params.thang);
    await this.loadList(params.thang);
  }

  private async loadList(thang: string): Promise<void> {
    this.setState("loading", true);
    try {
      const list = await timesheetService.getList({ thang });
      this.setState("timesheetList", list);
    } catch (error) {
      console.error("Load bang cong error:", error);
      this.setState("timesheetList", []);
    } finally {
      this.setState("loading", false);
    }
  }

  private async loadKyHieu(): Promise<void> {
    try {
      const kyHieuList = await timesheetService.getKyHieu();
      this.setState("kyHieuList", kyHieuList);
    } catch (error) {
      console.error("Load ky hieu bang cong error:", error);
      this.setState("kyHieuList", []);
    }
  }
}
