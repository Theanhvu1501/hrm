import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { vaiTroService } from "@/services/vaiTroService";
import { VaiTroItem } from "../../components/table/VaiTroTable.state";
import "./init.event";

@RegisterHandler("vai-tro-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    this.setState("modalVisible", false);
    this.setState("editingRecord", null);

    try {
      const data = await vaiTroService.getAll();
      const vaiTroList: VaiTroItem[] = data.map((item) => ({
        id: item._id,
        ten: item.ten,
        moTa: item.moTa || "",
        soNguoiDung: 0,
        trangThai: item.isActive ? "HOAT_DONG" : "KHOA",
      }));
      this.setState("vaiTroList", vaiTroList);
    } catch (error) {
      console.error("Init vai tro error:", error);
      this.setState("vaiTroList", []);
    }

    this.setState("loading", false);
  }
}
