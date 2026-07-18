import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService, UpdateEntryDto } from "@/services/nhatKyChungService";
import { DanhMuc, NhatKyChung } from "@/types";
import { TaiKhoanItem } from "../init/init.state";
import { message } from "antd";
import { NhatKyChungStates, NhatKyChungEvents } from "../../nhat-ky-chung.handler";
import type {
  StartEditRowParams,
  UpdateRowValueParams,
} from "./inline-edit.event";
import { EditingRowValues } from "./inline-edit.state";
import "./inline-edit.event";
import "./inline-edit.state";
import dayjs from "dayjs";

@RegisterHandler("nhat-ky-chung")
export class InlineEditHandler extends CSubHanlder<NhatKyChungEvents, NhatKyChungStates> {

  // ==================== ROW EDIT ====================

  @HandlerDecorator("startEditRow")
  async startEditRow(params: StartEditRowParams): Promise<void> {
    const { rowId, record } = params;

    // Check if row is approved
    if ((record as any).trangThai === "DA_DUYET") {
      message.warning("Không thể sửa bút toán đã duyệt");
      return;
    }

    // If editing another row, cancel it first
    const currentEditingRowId = this.getState("editingRowId");
    if (currentEditingRowId && currentEditingRowId !== rowId) {
      this.setState("editingRowId", null);
      this.setState("editingRowOriginal", null);
      this.setState("editingRowValues", {});
    }

    // Initialize row values from record
    const initialValues: EditingRowValues = {
      ngay: record.ngay,
      dienGiai: record.dienGiai,
      taiKhoanNo: record.taiKhoanNo,
      taiKhoanCo: record.taiKhoanCo,
      soTien: record.soTien,
      nguoiGiaoDich: record.nguoiGiaoDich || "",
      diaChi: record.diaChi || "",
      ghiChu: record.ghiChu || "",
    };

    this.setState("editingRowId", rowId);
    this.setState("editingRowOriginal", record);
    this.setState("editingRowValues", initialValues);
    this.setState("inlineEditError", null);
  }

  @HandlerDecorator("cancelEditRow")
  async cancelEditRow(): Promise<void> {
    this.setState("editingRowId", null);
    this.setState("editingRowOriginal", null);
    this.setState("editingRowValues", {});
    this.setState("inlineEditError", null);
  }

  @HandlerDecorator("updateRowValue")
  async updateRowValue(params: UpdateRowValueParams): Promise<void> {
    const { columnKey, value } = params;

    const currentValues = (this.getState("editingRowValues") || {}) as EditingRowValues;
    this.setState("editingRowValues", {
      ...currentValues,
      [columnKey]: value,
    });
  }

  @HandlerDecorator("saveEditRow")
  async saveEditRow(): Promise<void> {
    const editingRowId = this.getState("editingRowId") as string | null;
    const editingRowOriginal = this.getState("editingRowOriginal") as NhatKyChung | null;
    const editingRowValues = (this.getState("editingRowValues") || {}) as EditingRowValues;

    if (!editingRowId || !editingRowOriginal) {
      return;
    }

    // Check if any value changed
    const hasChanges = this.checkRowChanges(editingRowOriginal, editingRowValues);
    if (!hasChanges) {
      message.info("Không có thay đổi");
      await this.executeEvent("cancelEditRow", {});
      return;
    }

    this.setState("savingRow", true);
    this.setState("inlineEditError", null);

    try {
      // Build update data from changed values
      const updateData = this.buildUpdateData(editingRowValues, editingRowOriginal);

      // Call API
      await nhatKyChungService.update(editingRowId, updateData);

      // Success
      message.success("Cập nhật thành công");
      this.setState("editingRowId", null);
      this.setState("editingRowOriginal", null);
      this.setState("editingRowValues", {});

      // Refresh data
      await this.refreshData();

    } catch (error) {
      console.error("Error saving row edit:", error);
      const errorMessage = error instanceof Error ? error.message : "Không thể cập nhật dữ liệu";
      this.setState("inlineEditError", errorMessage);
      message.error(errorMessage);
    } finally {
      this.setState("savingRow", false);
    }
  }

  // ==================== HELPERS ====================

  private checkRowChanges(original: NhatKyChung, values: EditingRowValues): boolean {
    return (
      values.ngay !== original.ngay ||
      values.dienGiai !== original.dienGiai ||
      values.taiKhoanNo !== original.taiKhoanNo ||
      values.taiKhoanCo !== original.taiKhoanCo ||
      values.soTien !== original.soTien ||
      values.nguoiGiaoDich !== (original.nguoiGiaoDich || "") ||
      values.diaChi !== (original.diaChi || "") ||
      values.ghiChu !== (original.ghiChu || "")
    );
  }

  private async refreshData(): Promise<void> {
    const pagination = this.getState("pagination") as { page: number; limit: number } | undefined;
    await this.executeEvent("loadPage", {
      page: pagination?.page || 1,
      limit: pagination?.limit || 100
    });
  }

  private buildUpdateData(values: EditingRowValues, original: NhatKyChung): UpdateEntryDto {
    const updateData: UpdateEntryDto = {};
    const taiKhoanList = (this.getState("taiKhoanList") as TaiKhoanItem[]) || [];

    // BE replace toàn bộ danhMuc khi PATCH → phải merge từ danhMuc hiện hữu của chứng từ,
    // chỉ thay phần tài khoản được sửa (tránh mất dữ liệu + 400 oan từ fieldRules validation)
    const ensureDanhMuc = (): DanhMuc => {
      if (!updateData.danhMuc) {
        updateData.danhMuc = { ...(original.danhMuc || {}) };
      }
      return updateData.danhMuc;
    };

    const buildTaiKhoanSnapshot = (ma: string) => {
      const tk = taiKhoanList.find((t) => t.ma === ma);
      return {
        ma,
        ten: tk?.ten || "",
        loai: tk?.loai || "",
        nhom: tk?.nhom || "",
      };
    };

    for (const [columnKey, value] of Object.entries(values)) {
      switch (columnKey) {
        case "ngay":
          if (dayjs.isDayjs(value)) {
            updateData.ngay = value.toISOString();
          } else if (typeof value === "string") {
            updateData.ngay = value;
          }
          break;

        case "dienGiai":
          updateData.noiDung = value as string;
          break;

        case "soTien":
          updateData.soTien = Number(value);
          break;

        case "nguoiGiaoDich":
          updateData.nguoiGiaoDich = value as string;
          break;

        case "diaChi":
          updateData.diaChi = value as string;
          break;

        case "ghiChu":
          updateData.ghiChu = value as string;
          break;

        case "taiKhoanNo":
          if (value !== original.taiKhoanNo) {
            ensureDanhMuc().taiKhoanNo = buildTaiKhoanSnapshot(value as string);
          }
          break;

        case "taiKhoanCo":
          if (value !== original.taiKhoanCo) {
            ensureDanhMuc().taiKhoanCo = buildTaiKhoanSnapshot(value as string);
          }
          break;
      }
    }

    return updateData;
  }
}
