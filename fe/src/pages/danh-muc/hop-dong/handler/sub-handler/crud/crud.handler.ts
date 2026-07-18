import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { hopDongService } from "@/services/hopDongService";
import { HopDong } from "@/types";
import "./crud.event";

@RegisterHandler("hop-dong")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("create")
  async create(params: { data: Omit<HopDong, 'id'> }): Promise<HopDong> {
    this.setState("loading", true);
    try {
      const result = await hopDongService.create(params.data);
      await this.executeEvent("refresh", {});
      return result;
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("update")
  async update(params: { id: string; data: Partial<HopDong> }): Promise<HopDong> {
    this.setState("loading", true);
    try {
      const result = await hopDongService.update(params.id, params.data);
      await this.executeEvent("refresh", {});
      return result;
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("remove")
  async remove(params: { id: string }): Promise<void> {
    this.setState("loading", true);
    try {
      await hopDongService.remove(params.id);
      await this.executeEvent("refresh", {});
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("search")
  async search(params: { keyword: string }): Promise<void> {
    this.setState("loading", true);
    this.setState("searchKeyword", params.keyword);
    try {
      const pagination = this.getState("pagination") || { current: 1, pageSize: 50, total: 0 };
      const result = await hopDongService.getPaginated({
        page: 1,
        limit: pagination.pageSize,
        search: params.keyword || undefined,
      });
      this.setState("data", result.data);
      this.setState("pagination", {
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("changePage")
  async changePage(params: { page: number; pageSize: number }): Promise<void> {
    this.setState("loading", true);
    try {
      const searchKeyword = this.getState("searchKeyword") || "";
      const result = await hopDongService.getPaginated({
        page: params.page,
        limit: params.pageSize,
        search: searchKeyword || undefined,
      });
      this.setState("data", result.data);
      this.setState("pagination", {
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
    } finally {
      this.setState("loading", false);
    }
  }
}
