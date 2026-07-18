import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService, CreateEntryDto, BatchItemDto } from "@/services/nhatKyChungService";
import { message, Modal } from "antd";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import "./submit.event";
import { NhatKyChungFormStates, NhatKyChungFormEvents } from "../../nhat-ky-chung-form.handler";
import { ChungTuHeader, ChungTuChiTiet, TaiKhoanItem } from "../init/init.state";
import { DanhMuc, LoaiChungTu, LoaiGiaoDich } from "@/types";
import { validateFieldRules, formatViolation } from "../../../fieldRulesValidation";

@RegisterHandler("nhat-ky-chung-form")
export class SubmitFormHandler extends CSubHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  @HandlerDecorator("validateForm")
  async validateForm(): Promise<{ valid: boolean; errors: string[] }> {
    const header = this.getState("header") as ChungTuHeader | null;
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
    const errors: string[] = [];

    // Validate header
    if (!header?.ngay) {
      errors.push("Vui lòng chọn ngày chứng từ");
    }

    if (!header?.loaiGiaoDich) {
      errors.push("Vui lòng chọn loại giao dịch");
    }

    // Validate chi tiết
    if (chiTietList.length === 0) {
      errors.push("Vui lòng thêm ít nhất 1 dòng chi tiết");
    }

    chiTietList.forEach((item, index) => {
      if (!item.nghiepVu) {
        errors.push(`Dòng ${index + 1}: Vui lòng chọn nghiệp vụ`);
      }
      if (!item.taiKhoanNo) {
        errors.push(`Dòng ${index + 1}: Vui lòng chọn TK Nợ`);
      }
      if (!item.taiKhoanCo) {
        errors.push(`Dòng ${index + 1}: Vui lòng chọn TK Có`);
      }
      if (!item.soTien || item.soTien <= 0) {
        errors.push(`Dòng ${index + 1}: Số tiền phải lớn hơn 0`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  @HandlerDecorator("submitForm")
  async submitForm(): Promise<void> {
    // Validate first
    const validation = await this.executeEvent("validateForm", {});
    if (!validation.valid) {
      validation.errors.forEach((err) => message.error(err));
      return;
    }

    // Kiểm tra quy tắc nhập liệu theo cấu hình tài khoản (fieldRules)
    const chiTietForRules = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
    const taiKhoanForRules = (this.getState("taiKhoanList") as TaiKhoanItem[]) || [];
    const ruleViolations = validateFieldRules(chiTietForRules, taiKhoanForRules);
    const blocking = ruleViolations.filter((v) => v.level === "BAT_BUOC");
    if (blocking.length > 0) {
      blocking.forEach((v) => message.error(formatViolation(v)));
      return;
    }
    const warnings = ruleViolations.filter((v) => v.level === "CANH_BAO");
    if (warnings.length > 0) {
      const proceed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: "Cảnh báo thiếu thông tin",
          content: warnings.map((v) => formatViolation(v)).join("; "),
          okText: "Vẫn lưu",
          cancelText: "Quay lại",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!proceed) return;
    }

    const header = this.getState("header") as ChungTuHeader;
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
    const isEditing = this.getState("isEditing") as boolean;

    this.setState("submitting", true);

    try {
      // Determine loai (PHIEU_THU or PHIEU_CHI) from loaiGiaoDich
      const loai: LoaiChungTu = header.loaiGiaoDich === "PHIEU_CHI" || header.loaiGiaoDich === "BAO_NO"
        ? "PHIEU_CHI"
        : "PHIEU_THU";

      if (isEditing && header.soPhieu) {
        // Build items for batch update with id tracking
        const items: BatchItemDto[] = chiTietList.map((ct) => ({
          id: ct.id, // Include id for existing items (undefined for new)
          loai,
          ngay: header.ngay.format("YYYY-MM-DD"),
          ngayGhiSo: (header.ngayGhiSo || header.ngay).format("YYYY-MM-DD"),
          soTien: ct.soTien,
          noiDung: ct.noiDung || header.dienGiaiChung || "",
          soTaiKhoan: ct.soTaiKhoan,
          nguoiGiaoDich: header.nguoiGiaoDich,
          diaChi: header.diaChi,
          ghiChu: header.ghiChu,
          danhMuc: this.buildDanhMuc(ct, header),
        }));

        // Update batch
        await nhatKyChungService.updateBatch(header.soPhieu, items);
        message.success("Cập nhật chứng từ thành công");
      } else {
        // Build items for batch create (no id needed)
        const items: CreateEntryDto[] = chiTietList.map((ct) => ({
          loai,
          ngay: header.ngay.format("YYYY-MM-DD"),
          ngayGhiSo: (header.ngayGhiSo || header.ngay).format("YYYY-MM-DD"),
          soTien: ct.soTien,
          noiDung: ct.noiDung || header.dienGiaiChung || "",
          soTaiKhoan: ct.soTaiKhoan,
          nguoiGiaoDich: header.nguoiGiaoDich,
          diaChi: header.diaChi,
          ghiChu: header.ghiChu,
          danhMuc: this.buildDanhMuc(ct, header),
        }));

        // Create batch
        await nhatKyChungService.createBatch(items);
        message.success("Tạo chứng từ thành công");
      }

      // Navigate back
      window.history.back();
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Có lỗi xảy ra");
    } finally {
      this.setState("submitting", false);
    }
  }

  @HandlerDecorator("resetForm")
  async resetForm(): Promise<void> {
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

  private buildDanhMuc(chiTiet: ChungTuChiTiet, header: ChungTuHeader): DanhMuc {
    const taiKhoanList = (this.getState("taiKhoanList") as TaiKhoanItem[]) || [];
    const loaiGiaoDichList = (this.getState("loaiGiaoDichList") as LoaiGiaoDich[]) || [];

    const danhMuc: DanhMuc = {};

    // Tài khoản Nợ
    if (chiTiet.taiKhoanNo) {
      const tkNo = taiKhoanList.find((tk) => tk.ma === chiTiet.taiKhoanNo);
      danhMuc.taiKhoanNo = {
        ma: chiTiet.taiKhoanNo,
        ten: tkNo?.ten || "",
        loai: tkNo?.loai || "",
        nhom: tkNo?.nhom || "",
      };
    }

    // Tài khoản Có
    if (chiTiet.taiKhoanCo) {
      const tkCo = taiKhoanList.find((tk) => tk.ma === chiTiet.taiKhoanCo);
      danhMuc.taiKhoanCo = {
        ma: chiTiet.taiKhoanCo,
        ten: tkCo?.ten || "",
        loai: tkCo?.loai || "",
        nhom: tkCo?.nhom || "",
      };
    }

    // Loại giao dịch từ header - lấy tên từ loaiGiaoDichList
    if (header.loaiGiaoDich) {
      const loaiGD = loaiGiaoDichList.find((lgd) => lgd.ma === header.loaiGiaoDich);
      danhMuc.loaiGiaoDich = {
        ma: header.loaiGiaoDich,
        ten: loaiGD?.ten || header.loaiGiaoDich,
      };
    }

    // Nghiệp vụ từ chi tiết
    if (chiTiet.nghiepVu) {
      danhMuc.nghiepVu = {
        ma: chiTiet.nghiepVu,
        ten: chiTiet.nghiepVuTen || chiTiet.nghiepVu,
      };
    }

    // Snapshots from chi tiết
    if (chiTiet.doiTuongSnapshot) {
      danhMuc.doiTuong = chiTiet.doiTuongSnapshot as DanhMuc["doiTuong"];
    }
    if (chiTiet.doiTuong2Snapshot) {
      danhMuc.doiTuong2 = chiTiet.doiTuong2Snapshot as DanhMuc["doiTuong2"];
    }
    if (chiTiet.duAnSnapshot) {
      danhMuc.duAn = chiTiet.duAnSnapshot as DanhMuc["duAn"];
    }
    if (chiTiet.boPhanSnapshot) {
      danhMuc.boPhan = chiTiet.boPhanSnapshot as DanhMuc["boPhan"];
    }
    if (chiTiet.doiSnapshot) {
      danhMuc.doi = chiTiet.doiSnapshot as DanhMuc["doi"];
    }
    if (chiTiet.nhanVienSnapshot) {
      danhMuc.nhanVien = chiTiet.nhanVienSnapshot as DanhMuc["nhanVien"];
    }
    if (chiTiet.sanPhamSnapshot) {
      danhMuc.sanPham = chiTiet.sanPhamSnapshot as DanhMuc["sanPham"];
    }
    if (chiTiet.dongTienSnapshot) {
      danhMuc.dongTien = chiTiet.dongTienSnapshot as DanhMuc["dongTien"];
    }
    if (chiTiet.nhomKhuyenMaiSnapshot) {
      danhMuc.nhomKhuyenMai = chiTiet.nhomKhuyenMaiSnapshot as DanhMuc["nhomKhuyenMai"];
    }
    if (chiTiet.nhomQuanLySnapshot) {
      danhMuc.nhomQuanLy = chiTiet.nhomQuanLySnapshot as DanhMuc["nhomQuanLy"];
    }
    if (chiTiet.khoanMucSnapshot) {
      danhMuc.khoanMuc = chiTiet.khoanMucSnapshot as DanhMuc["khoanMuc"];
    }
    if (chiTiet.hopDongSnapshot) {
      danhMuc.hopDong = chiTiet.hopDongSnapshot as DanhMuc["hopDong"];
    }

    return danhMuc;
  }
}
