import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { doiTuongService } from "@/services/doiTuongService";
import { duAnService } from "@/services/duAnService";
import { boPhanService } from "@/services/boPhanService";
import { sanPhamService } from "@/services/sanPhamService";
import { dongTienService } from "@/services/dongTienService";
import { PhieuStates } from "../../../phieu.handler";
import { InitEvent } from "../init/init.event";
import "../init/init.event";

@RegisterHandler("phieu")
export class LoadMasterDataHandler extends CSubHanlder<InitEvent, PhieuStates> {
  @HandlerDecorator("loadMasterData")
  async loadMasterData(): Promise<void> {
    const results = await Promise.allSettled([
      doiTuongService.getAll(),
      duAnService.getAll(),
      boPhanService.getAll(),
      sanPhamService.getAll(),
      dongTienService.getAll(),
    ]);
    const [dt, da, bp, sp, dts] = results;
    if (dt.status === "fulfilled") this.setState("doiTuongList", dt.value);
    else console.error("Error loading doiTuong list:", dt.reason);
    if (da.status === "fulfilled") this.setState("duAnList", da.value);
    else console.error("Error loading duAn list:", da.reason);
    if (bp.status === "fulfilled") this.setState("boPhanList", bp.value);
    else console.error("Error loading boPhan list:", bp.reason);
    if (sp.status === "fulfilled") this.setState("sanPhamList", sp.value);
    else console.error("Error loading sanPham list:", sp.reason);
    if (dts.status === "fulfilled") this.setState("dongTienList", dts.value);
    else console.error("Error loading dongTien list:", dts.reason);
  }
}
