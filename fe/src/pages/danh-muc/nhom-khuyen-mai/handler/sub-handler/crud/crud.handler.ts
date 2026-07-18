import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhomKhuyenMaiService } from "@/services/nhomKhuyenMaiService";
import { NhomKhuyenMai } from "@/types";
import "./crud.event";

@RegisterHandler("nhom-khuyen-mai")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("create")
  async create(params: { data: Omit<NhomKhuyenMai, 'id'> }): Promise<NhomKhuyenMai> {
    this.setState("loading", true);
    try {
      const result = await nhomKhuyenMaiService.create(params.data);
      await this.executeEvent("refresh", {});
      return result;
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("update")
  async update(params: { id: string; data: Partial<NhomKhuyenMai> }): Promise<NhomKhuyenMai> {
    this.setState("loading", true);
    try {
      const result = await nhomKhuyenMaiService.update(params.id, params.data);
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
      await nhomKhuyenMaiService.remove(params.id);
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
      const result = await nhomKhuyenMaiService.getPaginated({
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
      const result = await nhomKhuyenMaiService.getPaginated({
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
