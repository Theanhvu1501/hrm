import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import dayjs from "dayjs";
import { DanhMuc, NhatKyChung, DoiTuong, DuAn, BoPhan, SanPham, DongTien, NhomKhuyenMai, NhomQuanLy, KhoanMuc, TaiKhoanNganHang, DoiTuongSnapshot } from "@/types";
import {
  buildDoiTuongSnapshot,
  buildDuAnSnapshot,
  buildBoPhanSnapshot,
  buildSanPhamSnapshot,
  buildDongTienSnapshot,
  buildNhomKhuyenMaiSnapshot,
  buildNhomQuanLySnapshot,
  buildKhoanMucSnapshot,
  buildNganHangSnapshot,
} from "@/utils/snapshotBuilder";
import {
  NhatKyChungStates,
  NhatKyChungEvents,
} from "../../../handler/nhat-ky-chung.handler";
import { TaiKhoanItem, KhoanMucItem } from "../init/init.state";
import { LoaiChungTuType } from "@/services/loaiChungTuService";
import { FormValues, SubmitData, InitFormResult } from "./form.types";
import "./form.event";

@RegisterHandler("nhat-ky-chung")
export class FormHandler extends CSubHanlder<
  NhatKyChungEvents,
  NhatKyChungStates
> {
  /**
   * Build danhMuc object from form values
   */
  private buildDanhMuc(values: FormValues): DanhMuc {
    const danhMuc: DanhMuc = {};
    const taiKhoanList = (this.getState("taiKhoanList") as TaiKhoanItem[]) || [];
    const loaiChungTuList = (this.getState("loaiChungTuList") as LoaiChungTuType[]) || [];

    if (values.doiTuongSnapshot) {
      danhMuc.doiTuong = values.doiTuongSnapshot;
    }
    if (values.doiTuong2Snapshot) {
      danhMuc.doiTuong2 = values.doiTuong2Snapshot;
    }
    if (values.duAnSnapshot) {
      danhMuc.duAn = values.duAnSnapshot;
    }
    if (values.boPhanSnapshot) {
      danhMuc.boPhan = values.boPhanSnapshot;
    }
    if (values.doiSnapshot) {
      danhMuc.doi = values.doiSnapshot;
    }
    if (values.nhanVienSnapshot) {
      danhMuc.nhanVien = values.nhanVienSnapshot;
    }
    if (values.sanPhamSnapshot) {
      danhMuc.sanPham = values.sanPhamSnapshot;
    }
    if (values.dongTienSnapshot) {
      danhMuc.dongTien = values.dongTienSnapshot;
    }
    if (values.nhomKhuyenMaiSnapshot) {
      danhMuc.nhomKhuyenMai = values.nhomKhuyenMaiSnapshot;
    }
    if (values.nhomQuanLySnapshot) {
      danhMuc.nhomQuanLy = values.nhomQuanLySnapshot;
    }
    if (values.khoanMucSnapshot) {
      danhMuc.khoanMuc = values.khoanMucSnapshot;
    }
    if (values.taiKhoanNo) {
      const tkNo = taiKhoanList.find(tk => tk.ma === values.taiKhoanNo);
      danhMuc.taiKhoanNo = {
        ma: values.taiKhoanNo,
        ten: tkNo?.ten || "",
        loai: tkNo?.loai || "",
        nhom: tkNo?.nhom || "",
      };
    }
    if (values.taiKhoanCo) {
      const tkCo = taiKhoanList.find(tk => tk.ma === values.taiKhoanCo);
      danhMuc.taiKhoanCo = {
        ma: values.taiKhoanCo,
        ten: tkCo?.ten || "",
        loai: tkCo?.loai || "",
        nhom: tkCo?.nhom || "",
      };
    }
    // Add loaiChungTu to danhMuc - lưu như danh mục
    if (values.loai) {
      const loaiChungTu = loaiChungTuList.find(lct => lct.ma === values.loai);
      danhMuc.loaiChungTu = {
        ma: values.loai,
        ten: loaiChungTu?.ten || values.loaiTen || values.loai,
      };
    }

    return danhMuc;
  }

  /**
   * Build submit data from form values
   */
  @HandlerDecorator("buildSubmitData")
  async buildSubmitData(params: { values: FormValues }): Promise<SubmitData> {
    const { values } = params;
    const danhMuc = this.buildDanhMuc(values);

    return {
      loai: values.loai,
      ngay: values.ngay.format("YYYY-MM-DD"),
      ngayGhiSo: (values.ngayGhiSo ?? values.ngay).format("YYYY-MM-DD"),
      soTien: values.soTien,
      noiDung: values.noiDung,
      nguoiGiaoDich: values.nguoiGiaoDich,
      diaChi: values.diaChi,
      ghiChu: values.ghiChu,
      danhMuc: Object.keys(danhMuc).length > 0 ? danhMuc : undefined,
    };
  }

  /**
   * Submit form - handles both create and update
   */
  @HandlerDecorator("submitForm")
  async submitForm(params: { values: FormValues }): Promise<void> {
    const { values } = params;
    const editingEntry = this.getState("editingEntry") as NhatKyChung | null;
    const hasChanges = this.getState("hasChanges") as boolean;
    const isEditing = !!editingEntry;

    const submitData = await this.executeEvent("buildSubmitData", { values });

    // If editing and there are master data changes, show confirmation
    if (isEditing && hasChanges) {
      this.setState("pendingSubmitData", submitData as unknown as Record<string, unknown>);
      this.setState("showUpdateConfirmModal", true);
      return;
    }

    // Execute directly
    if (isEditing && editingEntry) {
      await this.executeEvent("updateEntry", {
        id: editingEntry.id,
        data: {
          ngay: submitData.ngay,
          ngayGhiSo: submitData.ngayGhiSo,
          soTien: submitData.soTien,
          noiDung: submitData.noiDung,
          nguoiGiaoDich: submitData.nguoiGiaoDich,
          diaChi: submitData.diaChi,
          ghiChu: submitData.ghiChu,
          danhMuc: submitData.danhMuc,
        },
      });
    } else {
      await this.executeEvent("createEntry", {
        loai: submitData.loai as "PHIEU_THU" | "PHIEU_CHI",
        ngay: submitData.ngay,
        ngayGhiSo: submitData.ngayGhiSo,
        soTien: submitData.soTien,
        noiDung: submitData.noiDung,
        nguoiGiaoDich: submitData.nguoiGiaoDich,
        diaChi: submitData.diaChi,
        ghiChu: submitData.ghiChu,
        danhMuc: submitData.danhMuc,
      });
    }
  }

  /**
   * Get auto-fill values for master data fields when list has only one item
   */
  private getAutoFillValues(): Partial<InitFormResult> {
    const doiTuongList = (this.getState("doiTuongList") as DoiTuong[]) || [];
    const duAnList = (this.getState("duAnList") as DuAn[]) || [];
    const boPhanList = (this.getState("boPhanList") as BoPhan[]) || [];
    const sanPhamList = (this.getState("sanPhamList") as SanPham[]) || [];
    const dongTienList = (this.getState("dongTienList") as DongTien[]) || [];
    const nhomKhuyenMaiList = (this.getState("nhomKhuyenMaiList") as NhomKhuyenMai[]) || [];
    const nhomQuanLyList = (this.getState("nhomQuanLyList") as NhomQuanLy[]) || [];
    const khoanMucList = (this.getState("khoanMucList") as KhoanMucItem[]) || [];

    const result: Partial<InitFormResult> = {};

    // Đối tượng - filter by non-NHAN_VIEN
    const generalDoiTuong = doiTuongList.filter((d) => !d.loai.includes("NHAN_VIEN"));
    if (generalDoiTuong.length === 1) {
      const doiTuong = generalDoiTuong[0];
      result.doiTuongId = doiTuong.id;
      result.doiTuongSnapshot = buildDoiTuongSnapshot(doiTuong);
    }

    // Dự án
    if (duAnList.length === 1) {
      const duAn = duAnList[0];
      result.duAnId = duAn.id;
      result.duAnSnapshot = buildDuAnSnapshot(duAn);
      result.chuDauTuMa = duAn.chuDuAnMa;
      result.chuDauTuTen = duAn.chuDuAn;
    }

    // Bộ phận - filter out "đội" items
    const boPhanOnly = boPhanList.filter(
      (bp) => !bp.ten.toLowerCase().includes("đội")
    );
    if (boPhanOnly.length === 1) {
      const boPhan = boPhanOnly[0];
      result.boPhanId = boPhan.id;
      result.boPhanSnapshot = buildBoPhanSnapshot(boPhan);
    }

    // Đội thi công - filter "đội" items
    const doiOnly = boPhanList.filter((bp) =>
      bp.ten.toLowerCase().includes("đội")
    );
    if (doiOnly.length === 1) {
      const doi = doiOnly[0];
      result.doiId = doi.id;
      result.doiSnapshot = buildBoPhanSnapshot(doi);
    }

    // Nhân viên - filter NHAN_VIEN from doiTuongList
    const nhanVienOnly = doiTuongList.filter((d) => d.loai.includes("NHAN_VIEN"));
    if (nhanVienOnly.length === 1) {
      const nhanVien = nhanVienOnly[0];
      result.nhanVienId = nhanVien.id;
      result.nhanVienSnapshot = buildDoiTuongSnapshot(nhanVien);
    }

    // Sản phẩm
    if (sanPhamList.length === 1) {
      const sanPham = sanPhamList[0];
      result.sanPhamId = sanPham.id;
      result.sanPhamSnapshot = buildSanPhamSnapshot(sanPham);
    }

    // Dòng tiền
    if (dongTienList.length === 1) {
      const dongTien = dongTienList[0];
      result.dongTienId = dongTien.id;
      result.dongTienSnapshot = buildDongTienSnapshot(dongTien);
    }

    // Nhóm khuyến mại
    if (nhomKhuyenMaiList.length === 1) {
      const nhomKhuyenMai = nhomKhuyenMaiList[0];
      result.nhomKhuyenMaiId = nhomKhuyenMai.id;
      result.nhomKhuyenMaiSnapshot = buildNhomKhuyenMaiSnapshot(nhomKhuyenMai);
    }

    // Nhóm quản lý
    if (nhomQuanLyList.length === 1) {
      const nhomQuanLy = nhomQuanLyList[0];
      result.nhomQuanLyId = nhomQuanLy.id;
      result.nhomQuanLySnapshot = buildNhomQuanLySnapshot(nhomQuanLy);
    }

    // Khoản mục
    if (khoanMucList.length === 1) {
      const khoanMuc = khoanMucList[0];
      result.khoanMucId = khoanMuc.id;
      result.khoanMucSnapshot = buildKhoanMucSnapshot(khoanMuc as KhoanMuc);
    }

    return result;
  }

  /**
   * Get fill values for editing entry based on danhMuc
   */
  private getEditingFillValues(danhMuc: DanhMuc): Partial<InitFormResult> {
    const result: Partial<InitFormResult> = {};

    const doiTuongList = (this.getState("doiTuongList") as DoiTuong[]) || [];
    const duAnList = (this.getState("duAnList") as DuAn[]) || [];
    const boPhanList = (this.getState("boPhanList") as BoPhan[]) || [];
    const sanPhamList = (this.getState("sanPhamList") as SanPham[]) || [];
    const dongTienList = (this.getState("dongTienList") as DongTien[]) || [];
    const nhomKhuyenMaiList = (this.getState("nhomKhuyenMaiList") as NhomKhuyenMai[]) || [];
    const nhomQuanLyList = (this.getState("nhomQuanLyList") as NhomQuanLy[]) || [];
    const khoanMucList = (this.getState("khoanMucList") as KhoanMucItem[]) || [];
    const nganHangList = (this.getState("nganHangList") as TaiKhoanNganHang[]) || [];

    // Đối tượng có thể là ngân hàng/quỹ (loai NGAN_HANG_QUY) → tìm ở danh mục tương ứng
    const findDoiTuong = (
      snap: { ma?: string; loai?: string }
    ): { id: string; snapshot: DoiTuongSnapshot } | undefined => {
      if (snap.loai === "NGAN_HANG_QUY") {
        const found = nganHangList.find((nh) => nh.ma === snap.ma);
        return found
          ? { id: found.id, snapshot: buildNganHangSnapshot(found) }
          : undefined;
      }
      const found = doiTuongList.find((d) => d.ma === snap.ma);
      return found
        ? { id: found.id, snapshot: buildDoiTuongSnapshot(found) }
        : undefined;
    };

    // Đối tượng
    if (danhMuc.doiTuong) {
      const found = findDoiTuong(danhMuc.doiTuong);
      if (found) {
        result.doiTuongId = found.id;
        result.doiTuongSnapshot = found.snapshot;
      }
    }

    // Đối tượng 2
    if (danhMuc.doiTuong2) {
      const found = findDoiTuong(danhMuc.doiTuong2);
      if (found) {
        result.doiTuong2Id = found.id;
        result.doiTuong2Snapshot = found.snapshot;
      }
    }

    // Dự án
    if (danhMuc.duAn) {
      const found = duAnList.find((d) => d.ma === danhMuc.duAn?.ma);
      if (found) {
        result.duAnId = found.id;
        result.duAnSnapshot = buildDuAnSnapshot(found);
        result.chuDauTuMa = found.chuDuAnMa;
        result.chuDauTuTen = found.chuDuAn;
      }
    }

    // Bộ phận
    if (danhMuc.boPhan) {
      const found = boPhanList.find((b) => b.ma === danhMuc.boPhan?.ma);
      if (found) {
        result.boPhanId = found.id;
        result.boPhanSnapshot = buildBoPhanSnapshot(found);
      }
    }

    // Đội
    if (danhMuc.doi) {
      const found = boPhanList.find((b) => b.ma === danhMuc.doi?.ma);
      if (found) {
        result.doiId = found.id;
        result.doiSnapshot = buildBoPhanSnapshot(found);
      }
    }

    // Nhân viên
    if (danhMuc.nhanVien) {
      const found = doiTuongList.find((d) => d.ma === danhMuc.nhanVien?.ma);
      if (found) {
        result.nhanVienId = found.id;
        result.nhanVienSnapshot = buildDoiTuongSnapshot(found);
      }
    }

    // Sản phẩm
    if (danhMuc.sanPham) {
      const found = sanPhamList.find((s) => s.ma === danhMuc.sanPham?.ma);
      if (found) {
        result.sanPhamId = found.id;
        result.sanPhamSnapshot = buildSanPhamSnapshot(found);
      }
    }

    // Dòng tiền
    if (danhMuc.dongTien) {
      const found = dongTienList.find((d) => d.ma === danhMuc.dongTien?.ma);
      if (found) {
        result.dongTienId = found.id;
        result.dongTienSnapshot = buildDongTienSnapshot(found);
      }
    }

    // Nhóm khuyến mại
    if (danhMuc.nhomKhuyenMai) {
      const found = nhomKhuyenMaiList.find((nkm) => nkm.ma === danhMuc.nhomKhuyenMai?.ma);
      if (found) {
        result.nhomKhuyenMaiId = found.id;
        result.nhomKhuyenMaiSnapshot = buildNhomKhuyenMaiSnapshot(found);
      }
    }

    // Nhóm quản lý
    if (danhMuc.nhomQuanLy) {
      const found = nhomQuanLyList.find((nql) => nql.ma === danhMuc.nhomQuanLy?.ma);
      if (found) {
        result.nhomQuanLyId = found.id;
        result.nhomQuanLySnapshot = buildNhomQuanLySnapshot(found);
      }
    }

    // Khoản mục
    if (danhMuc.khoanMuc) {
      const found = khoanMucList.find((km) => km.ma === danhMuc.khoanMuc?.ma);
      if (found) {
        result.khoanMucId = found.id;
        result.khoanMucSnapshot = buildKhoanMucSnapshot(found as KhoanMuc);
      }
    }

    return result;
  }

  /**
   * Initialize form values based on editing state
   */
  @HandlerDecorator("initFormValues")
  async initFormValues(): Promise<InitFormResult> {
    const editingEntry = this.getState("editingEntry") as NhatKyChung | null;
    const loaiChungTuList = (this.getState("loaiChungTuList") as LoaiChungTuType[]) || [];

    if (editingEntry) {
      // Editing mode - tìm loại chứng từ từ danhMuc hoặc loaiChungTu cũ
      let loaiMa: string | undefined;
      
      // Ưu tiên lấy từ danhMuc.loaiChungTu (dữ liệu mới)
      if (editingEntry.danhMuc?.loaiChungTu) {
        const { ma, ten } = editingEntry.danhMuc.loaiChungTu;
        let found = loaiChungTuList.find(lct => lct.ma === ma);
        if (!found && ten) {
          found = loaiChungTuList.find(lct => lct.ten === ten || lct.ma === ten);
        }
        loaiMa = found?.ma;
      }
      // Fallback: lấy từ danhMuc.loaiGiaoDich (dữ liệu cũ)
      else if (editingEntry.danhMuc?.loaiGiaoDich) {
        const { ma, ten } = editingEntry.danhMuc.loaiGiaoDich;
        let found = loaiChungTuList.find(lct => lct.ma === ma);
        if (!found && ten) {
          found = loaiChungTuList.find(lct => lct.ten === ten || lct.ma === ten);
        }
        loaiMa = found?.ma;
      }
      // Fallback: lấy từ loaiChungTu cũ (Phiếu thu/Phiếu chi)
      else if (editingEntry.loaiChungTu) {
        // Tìm theo tên cũ
        const found = loaiChungTuList.find(lct => 
          lct.ten === editingEntry.loaiChungTu || 
          (editingEntry.loaiChungTu === "Phiếu thu" && lct.ma.startsWith("THU_")) ||
          (editingEntry.loaiChungTu === "Phiếu chi" && lct.ma.startsWith("CHI_"))
        );
        loaiMa = found?.ma;
      }

      const baseValues: InitFormResult = {
        ngay: dayjs(editingEntry.ngay),
        ngayGhiSo: dayjs(editingEntry.ngayGhiSo || editingEntry.ngay),
        loai: loaiMa,
        soTien: editingEntry.soTien,
        noiDung: editingEntry.dienGiai,
        nguoiGiaoDich: editingEntry.nguoiGiaoDich,
        diaChi: editingEntry.diaChi,
        ghiChu: editingEntry.ghiChu,
        taiKhoanNo: editingEntry.taiKhoanNo,
        taiKhoanCo: editingEntry.taiKhoanCo,
      };

      // Fill master data from danhMuc
      if (editingEntry.danhMuc) {
        const fillValues = this.getEditingFillValues(editingEntry.danhMuc);
        return { ...baseValues, ...fillValues };
      }

      return baseValues;
    } else {
      // Create mode - không mặc định loại chứng từ
      const baseValues: InitFormResult = {
        ngay: dayjs(),
        ngayGhiSo: dayjs(),
      };

      // Auto-fill single value master data
      const autoFillValues = this.getAutoFillValues();
      return { ...baseValues, ...autoFillValues };
    }
  }
}
