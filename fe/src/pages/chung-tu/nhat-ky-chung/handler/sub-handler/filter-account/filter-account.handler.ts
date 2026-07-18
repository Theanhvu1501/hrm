import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import "./filter-account.event";

@RegisterHandler("nhat-ky-chung")
export class FilterAccountHandler extends CSubHanlder {
  @HandlerDecorator("filterByAccount")
  async filterByAccount(params: { account: string | undefined }): Promise<void> {
    const { account } = params;
    this.setState("filterAccount", account);
    // Reset to page 1 when account filter changes
    const pagination = this.getState("pagination") as { page: number; limit: number; total: number; totalPages: number } | undefined;
    if (pagination) {
      this.setState("pagination", { ...pagination, page: 1 });
    }
    this.executeEvent("refresh", {});
  }
}
