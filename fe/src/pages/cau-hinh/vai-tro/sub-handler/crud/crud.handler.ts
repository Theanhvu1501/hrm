import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { vaiTroService } from "@/services/vaiTroService";
import { VaiTroItem } from "../../components/table/VaiTroTable.state";
import { message } from "antd";
import "./crud.event";

@RegisterHandler("vai-tro-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("createVaiTro")
  async createVaiTro(params: {
    ten: string;
    moTa: string;
    trangThai: "HOAT_DONG" | "KHOA";
  }): Promise<void> {
    try {
      const created = await vaiTroService.create({
        ten: params.ten,
        moTa: params.moTa,
        isActive: params.trangThai === "HOAT_DONG",
      });

      const currentList = (this.getState("vaiTroList") as VaiTroItem[]) || [];
      const newItem: VaiTroItem = {
        id: created._id,
        ten: created.ten,
        moTa: created.moTa || "",
        soNguoiDung: 0,
        trangThai: created.isActive ? "HOAT_DONG" : "KHOA",
      };

      this.setState("vaiTroList", [...currentList, newItem]);
      this.setState("modalVisible", false);
      this.setState("editingRecord", null);
      message.success("Thêm vai trò thành công!");
    } catch (error) {
      console.error("Create vai tro error:", error);
      message.error("Không thể thêm vai trò");
    }
  }

  @HandlerDecorator("updateVaiTro")
  async updateVaiTro(params: {
    id: string;
    data: Partial<VaiTroItem>;
  }): Promise<void> {
    try {
      const updated = await vaiTroService.update(params.id, {
        ten: params.data.ten,
        moTa: params.data.moTa,
        isActive: params.data.trangThai === "HOAT_DONG",
      });

      const currentList = (this.getState("vaiTroList") as VaiTroItem[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id
          ? {
              ...item,
              ten: updated.ten,
              moTa: updated.moTa || "",
              trangThai: (updated.isActive ? "HOAT_DONG" : "KHOA") as "HOAT_DONG" | "KHOA",
            }
          : item
      );

      this.setState("vaiTroList", updatedList);
      this.setState("modalVisible", false);
      this.setState("editingRecord", null);
      message.success("Cập nhật vai trò thành công!");
    } catch (error) {
      console.error("Update vai tro error:", error);
      message.error("Không thể cập nhật vai trò");
    }
  }

  @HandlerDecorator("deleteVaiTro")
  async deleteVaiTro(params: { id: string }): Promise<void> {
    try {
      await vaiTroService.remove(params.id);

      const currentList = (this.getState("vaiTroList") as VaiTroItem[]) || [];
      const updatedList = currentList.filter((item) => item.id !== params.id);

      this.setState("vaiTroList", updatedList);
      message.success("Xoá vai trò thành công!");
    } catch (error) {
      console.error("Delete vai tro error:", error);
      message.error("Không thể xoá vai trò");
    }
  }

  @HandlerDecorator("openModal")
  async openModal(params: { record?: VaiTroItem }): Promise<void> {
    this.setState("editingRecord", params.record || null);
    this.setState("modalVisible", true);
  }

  @HandlerDecorator("closeModal")
  async closeModal(): Promise<void> {
    this.setState("modalVisible", false);
    this.setState("editingRecord", null);
  }
}
