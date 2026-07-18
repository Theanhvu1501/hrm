import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { taiKhoanService } from "@/services/taiKhoanService";
import { khoanMucService } from "@/services/khoanMucService";
import { doiTuongService } from "@/services/doiTuongService";
import { duAnService } from "@/services/duAnService";
import { boPhanService } from "@/services/boPhanService";
import { sanPhamService } from "@/services/sanPhamService";
import { dongTienService } from "@/services/dongTienService";
import { quyChauanService } from "@/services/quyChaunService";
import { nhomKhuyenMaiService } from "@/services/nhomKhuyenMaiService";
import { nhomQuanLyService } from "@/services/nhomQuanLyService";
import { loaiChungTuService } from "@/services/loaiChungTuService";
import { loaiGiaoDichService } from "@/services/loaiGiaoDichService";
import { hopDongService } from "@/services/hopDongService";
import { nganHangService } from "@/services/nganHangService";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import "./init.event";
import "./init.state";
import { NhatKyChungFormStates, NhatKyChungFormEvents } from "../../nhat-ky-chung-form.handler";

@RegisterHandler("nhat-ky-chung-form")
export class InitFormHandler extends CSubHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  @HandlerDecorator("init")
  async init(params: { soPhieu?: string }): Promise<void> {
    this.initializeDefaultStates();

    // Load master data
    await this.executeEvent("loadMasterData", {});

    // Nếu có soPhieu → load data để sửa
    if (params.soPhieu) {
      await this.executeEvent("loadDataBySoPhieu", { soPhieu: params.soPhieu });
      this.setState("isEditing", true);
    } else {
      // Tạo mới - khởi tạo header và 1 dòng chi tiết mặc định
      this.setState("header", {
        ngay: dayjs(),
        ngayGhiSo: dayjs(),
        loaiGiaoDich: undefined,
        loai: undefined,
        loaiTen: undefined,
        dienGiaiChung: "",
        nguoiGiaoDich: "",
        diaChi: "",
        ghiChu: "",
      });

      this.setState("chiTietList", [
        {
          key: uuidv4(),
          taiKhoanNo: "",
          taiKhoanCo: "",
          soTien: 0,
          noiDung: "",
          nghiepVu: undefined,
          nghiepVuTen: undefined,
        },
      ]);

      this.setState("isEditing", false);
    }

    this.setState("loading", false);
  }

  @HandlerDecorator("loadMasterData")
  async loadMasterData(): Promise<void> {
    const isLoaded = this.getState("masterDataLoaded");
    if (isLoaded) return;

    this.setState("loading", true);

    try {
      const [
        taiKhoanLeaf,
        khoanMucRes,
        doiTuong,
        duAn,
        boPhan,
        sanPham,
        dongTien,
        quyChuan,
        nhomKhuyenMai,
        nhomQuanLy,
        loaiChungTu,
        loaiGiaoDich,
        hopDong,
        nganHangRes,
      ] = await Promise.all([
        taiKhoanService.getLeafAccounts(),
        khoanMucService.getPaginated({ limit: 500 }),
        doiTuongService.getAll(),
        duAnService.getAll(),
        boPhanService.getAll(),
        sanPhamService.getAll(),
        dongTienService.getAll(),
        quyChauanService.getAll(),
        nhomKhuyenMaiService.getAll(),
        nhomQuanLyService.getAll(),
        loaiChungTuService.getAll(),
        loaiGiaoDichService.getAll(),
        hopDongService.getAll(),
        nganHangService.getPaginated({ limit: 500 }),
      ]);

      this.setState(
        "taiKhoanList",
        taiKhoanLeaf.map((tk) => ({
          ma: tk.ma,
          ten: tk.ten,
          loai: tk.loai,
          nhom: tk.nhom,
          chiTietTheo: tk.chiTietTheo,
          fieldRules: tk.fieldRules,
        }))
      );

      this.setState(
        "khoanMucList",
        khoanMucRes.data.map((km) => ({
          id: km.id,
          ma: km.ma,
          ten: km.ten,
          loai: km.loai,
          nhom: km.nhom,
        }))
      );

      this.setState("doiTuongList", doiTuong);
      this.setState("duAnList", duAn);
      this.setState("boPhanList", boPhan);
      this.setState("sanPhamList", sanPham);
      this.setState("dongTienList", dongTien);
      this.setState("quyChaunList", quyChuan);
      this.setState("nhomKhuyenMaiList", nhomKhuyenMai);
      this.setState("nhomQuanLyList", nhomQuanLy);
      this.setState("loaiChungTuList", loaiChungTu);
      this.setState("loaiGiaoDichList", loaiGiaoDich);
      this.setState("hopDongList", hopDong);
      this.setState("nganHangList", nganHangRes.data);
      this.setState("masterDataLoaded", true);
    } catch (error) {
      console.error("Error loading master data:", error);
    }
  }

  private initializeDefaultStates(): void {
    this.setState("loading", true);
    this.setState("submitting", false);
    this.setState("isEditing", false);
    this.setState("masterDataLoaded", false);
    this.setState("header", null);
    this.setState("chiTietList", []);
    this.setState("taiKhoanList", []);
    this.setState("khoanMucList", []);
    this.setState("doiTuongList", []);
    this.setState("duAnList", []);
    this.setState("boPhanList", []);
    this.setState("sanPhamList", []);
    this.setState("dongTienList", []);
    this.setState("quyChaunList", []);
    this.setState("loaiChungTuList", []);
    this.setState("loaiGiaoDichList", []);
    this.setState("nhomKhuyenMaiList", []);
    this.setState("nhomQuanLyList", []);
    this.setState("hopDongList", []);
    this.setState("nganHangList", []);
    this.setState("filteredNghiepVuList", []);
  }
}
