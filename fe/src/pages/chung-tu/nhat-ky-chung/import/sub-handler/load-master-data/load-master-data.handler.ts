import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { taiKhoanService } from "@/services/taiKhoanService";
import { khoanMucService } from "@/services/khoanMucService";
import { doiTuongService } from "@/services/doiTuongService";
import { nganHangService } from "@/services/nganHangService";
import { duAnService } from "@/services/duAnService";
import { boPhanService } from "@/services/boPhanService";
import { sanPhamService } from "@/services/sanPhamService";
import { dongTienService } from "@/services/dongTienService";
import { quyChauanService } from "@/services/quyChaunService";
import { nhomKhuyenMaiService } from "@/services/nhomKhuyenMaiService";
import { nhomQuanLyService } from "@/services/nhomQuanLyService";
import { loaiGiaoDichService } from "@/services/loaiGiaoDichService";
import { hopDongService } from "@/services/hopDongService";
import "./load-master-data.event";
import { ImportEvents } from "../../import.handler";
import { ImportStates } from "../../import.state";
import { ImportMasterData } from "../../lib/validate";

@RegisterHandler("nhat-ky-chung-import")
export class LoadMasterDataHandler extends CSubHanlder<ImportEvents, ImportStates> {
  @HandlerDecorator("loadMasterData")
  async loadMasterData(): Promise<void> {
    if (this.getState("masterDataLoaded")) return;
    this.setState("loadingMasterData", true);
    try {
      const [
        taiKhoanLeaf,
        khoanMucRes,
        doiTuong,
        nganHang,
        duAn,
        boPhan,
        sanPham,
        dongTien,
        quyChuan,
        nhomKhuyenMai,
        nhomQuanLy,
        loaiGiaoDich,
        hopDong,
      ] = await Promise.all([
        taiKhoanService.getLeafAccounts(),
        khoanMucService.getPaginated({ limit: 500 }),
        doiTuongService.getAll(),
        nganHangService.getAll(),
        duAnService.getAll(),
        boPhanService.getAll(),
        sanPhamService.getAll(),
        dongTienService.getAll(),
        quyChauanService.getAll(),
        nhomKhuyenMaiService.getAll(),
        nhomQuanLyService.getAll(),
        loaiGiaoDichService.getAll(),
        hopDongService.getAll(),
      ]);

      const masterData: ImportMasterData = {
        taiKhoanList: taiKhoanLeaf.map((tk) => ({
          ma: tk.ma,
          ten: tk.ten,
          loai: tk.loai,
          nhom: tk.nhom,
        })),
        khoanMucList: khoanMucRes.data,
        doiTuongList: doiTuong,
        nganHangList: nganHang,
        duAnList: duAn,
        boPhanList: boPhan,
        sanPhamList: sanPham,
        dongTienList: dongTien,
        quyChuanList: quyChuan,
        nhomKhuyenMaiList: nhomKhuyenMai,
        nhomQuanLyList: nhomQuanLy,
        loaiGiaoDichList: loaiGiaoDich,
        hopDongList: hopDong,
      };

      this.setState("masterData", masterData);
      this.setState("masterDataLoaded", true);
    } catch (e) {
      console.error("Lỗi load master data import:", e);
    } finally {
      this.setState("loadingMasterData", false);
    }
  }
}
