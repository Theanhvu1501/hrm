import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { doiTuongService } from "@/services/doiTuongService";
import { duAnService } from "@/services/duAnService";
import { boPhanService } from "@/services/boPhanService";
import { sanPhamService } from "@/services/sanPhamService";
import { dongTienService } from "@/services/dongTienService";
import { khoanMucService } from "@/services/khoanMucService";
import { hopDongService } from "@/services/hopDongService";
import { nhomKhuyenMaiService } from "@/services/nhomKhuyenMaiService";
import { nhomQuanLyService } from "@/services/nhomQuanLyService";
import "./load-master-data.event";
import { ImportEvents } from "../../import.handler";
import { ImportStates } from "../../import.state";
import { ImportMasterData } from "../../lib/validate";

@RegisterHandler("phieu-import")
export class LoadMasterDataHandler extends CSubHanlder<ImportEvents, ImportStates> {
  @HandlerDecorator("loadMasterData")
  async loadMasterData(): Promise<void> {
    if (this.getState("masterDataLoaded")) return;
    this.setState("loadingMasterData", true);
    try {
      const [
        doiTuong,
        duAn,
        boPhan,
        sanPham,
        dongTien,
        khoanMucRes,
        hopDong,
        nhomKhuyenMai,
        nhomQuanLy,
      ] = await Promise.all([
        doiTuongService.getAll(),
        duAnService.getAll(),
        boPhanService.getAll(),
        sanPhamService.getAll(),
        dongTienService.getAll(),
        khoanMucService.getPaginated({ limit: 500 }),
        hopDongService.getAll(),
        nhomKhuyenMaiService.getAll(),
        nhomQuanLyService.getAll(),
      ]);

      const masterData: ImportMasterData = {
        doiTuongList: doiTuong,
        duAnList: duAn,
        boPhanList: boPhan,
        sanPhamList: sanPham,
        dongTienList: dongTien,
        khoanMucList: khoanMucRes.data,
        hopDongList: hopDong,
        nhomKhuyenMaiList: nhomKhuyenMai,
        nhomQuanLyList: nhomQuanLy,
      };

      this.setState("masterData", masterData);
      this.setState("masterDataLoaded", true);
    } catch (e) {
      console.error("Lỗi load master data import phiếu:", e);
    } finally {
      this.setState("loadingMasterData", false);
    }
  }
}
