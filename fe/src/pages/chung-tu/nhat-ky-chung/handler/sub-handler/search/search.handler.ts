import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import "./search.event";

@RegisterHandler("nhat-ky-chung")
export class SearchHandler extends CSubHanlder {
  @HandlerDecorator("search")
  async search(params: { text: string }): Promise<void> {
    const { text } = params;
    this.setState("searchText", text);
    // Reset to page 1 when search changes
    const pagination = this.getState("pagination") as { page: number; limit: number; total: number; totalPages: number } | undefined;
    if (pagination) {
      this.setState("pagination", { ...pagination, page: 1 });
    }
    this.executeEvent("refresh", {});
  }
}
