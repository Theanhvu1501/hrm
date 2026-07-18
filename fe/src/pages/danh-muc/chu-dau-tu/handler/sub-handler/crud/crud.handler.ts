import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { chuDauTuService } from "@/services/chuDauTuService";
import { ChuDauTu } from "@/types";
import "./crud.event";

@RegisterHandler("chu-dau-tu")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("create")
  async create(params: { data: Omit<ChuDauTu, 'id'> }): Promise<ChuDauTu> {
    this.setState("loading", true);
    try {
      const result = await chuDauTuService.create(params.data);
      await this.executeEvent("refresh", {});
      return result;
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("update")
  async update(params: { id: string; data: Partial<ChuDauTu> }): Promise<ChuDauTu> {
    this.setState("loading", true);
    try {
      const result = await chuDauTuService.update(params.id, params.data);
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
      await chuDauTuService.remove(params.id);
      await this.executeEvent("refresh", {});
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("search")
  async search(params: { keyword: string }): Promise<void> {
    this.setState("loading", true);
    this.setState("searchText", params.keyword);
    try {
      const pagination = this.getState("pagination") || { current: 1, pageSize: 10, total: 0 };
      const result = await chuDauTuService.getPaginated({
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
      const searchText = this.getState("searchText") || "";
      const result = await chuDauTuService.getPaginated({
        page: params.page,
        limit: params.pageSize,
        search: searchText || undefined,
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
