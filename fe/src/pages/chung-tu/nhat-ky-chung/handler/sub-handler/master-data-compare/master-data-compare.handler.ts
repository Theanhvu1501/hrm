import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { DoiTuong, DuAn, BoPhan, SanPham, DongTien, DanhMuc } from "@/types";
import {
  NhatKyChungStates,
  NhatKyChungEvents,
} from "../../../handler/nhat-ky-chung.handler";
import {
  MasterDataChanges,
  MasterDataChangeItem,
  FIELD_LABELS,
} from "./master-data-compare.types";
import "./master-data-compare.event";
import "./master-data-compare.state";

interface MasterDataItem {
  ma: string;
  ten: string;
  isActive?: boolean;
  deleted?: boolean;
}

@RegisterHandler("nhat-ky-chung")
export class MasterDataCompareHandler extends CSubHanlder<
  NhatKyChungEvents,
  NhatKyChungStates
> {
  /**
   * Check if master data item is active (not deleted)
   */
  private isItemActive(item: MasterDataItem): boolean {
    if (item.deleted === true) return false;
    if (item.isActive === false) return false;
    return true;
  }

  /**
   * Compare a single field between saved snapshot and current master data
   */
  private compareField(
    field: string,
    savedSnapshot: { ma: string; ten: string } | undefined,
    masterDataList: MasterDataItem[] | undefined
  ): MasterDataChangeItem | undefined {
    if (!savedSnapshot) return undefined;

    const currentItem = masterDataList?.find(
      (item) => item.ma === savedSnapshot.ma
    );

    // Item not found or deleted/inactive
    if (!currentItem || !this.isItemActive(currentItem)) {
      return {
        field,
        label: FIELD_LABELS[field],
        oldValue: savedSnapshot.ten,
        newValue: null,
        status: "deleted",
      };
    }

    // Item found but name changed
    if (currentItem.ten !== savedSnapshot.ten) {
      return {
        field,
        label: FIELD_LABELS[field],
        oldValue: savedSnapshot.ten,
        newValue: currentItem.ten,
        status: "changed",
      };
    }

    return undefined;
  }

  @HandlerDecorator("compareMasterData")
  async compareMasterData(payload: { danhMuc: DanhMuc }): Promise<void> {
    const { danhMuc } = payload;
    if (!danhMuc) {
      this.setState("masterDataChanges", {});
      this.setState("hasChanges", false);
      return;
    }

    const doiTuongList = this.getState("doiTuongList") as DoiTuong[];
    const duAnList = this.getState("duAnList") as DuAn[];
    const boPhanList = this.getState("boPhanList") as BoPhan[];
    const sanPhamList = this.getState("sanPhamList") as SanPham[];
    const dongTienList = this.getState("dongTienList") as DongTien[];

    const changes: MasterDataChanges = {};

    // Compare đối tượng
    const doiTuongChange = this.compareField(
      "doiTuong",
      danhMuc.doiTuong,
      doiTuongList as unknown as MasterDataItem[]
    );
    if (doiTuongChange) changes.doiTuong = doiTuongChange;

    // Compare dự án
    const duAnChange = this.compareField(
      "duAn",
      danhMuc.duAn,
      duAnList as unknown as MasterDataItem[]
    );
    if (duAnChange) changes.duAn = duAnChange;

    // Compare bộ phận
    const boPhanChange = this.compareField(
      "boPhan",
      danhMuc.boPhan,
      boPhanList as unknown as MasterDataItem[]
    );
    if (boPhanChange) changes.boPhan = boPhanChange;

    // Compare đội
    const doiChange = this.compareField(
      "doi",
      danhMuc.doi,
      boPhanList as unknown as MasterDataItem[]
    );
    if (doiChange) changes.doi = doiChange;

    // Compare nhân viên
    const nhanVienChange = this.compareField(
      "nhanVien",
      danhMuc.nhanVien,
      doiTuongList as unknown as MasterDataItem[]
    );
    if (nhanVienChange) changes.nhanVien = nhanVienChange;

    // Compare sản phẩm
    const sanPhamChange = this.compareField(
      "sanPham",
      danhMuc.sanPham,
      sanPhamList as unknown as MasterDataItem[]
    );
    if (sanPhamChange) changes.sanPham = sanPhamChange;

    // Compare dòng tiền
    const dongTienChange = this.compareField(
      "dongTien",
      danhMuc.dongTien,
      dongTienList as unknown as MasterDataItem[]
    );
    if (dongTienChange) changes.dongTien = dongTienChange;

    this.setState("masterDataChanges", changes);
    this.setState("hasChanges", Object.keys(changes).length > 0);
  }

  @HandlerDecorator("clearMasterDataChanges")
  async clearMasterDataChanges(): Promise<void> {
    this.setState("masterDataChanges", {});
    this.setState("hasChanges", false);
    this.setState("pendingSubmitData", null);
    this.setState("showUpdateConfirmModal", false);
  }

  @HandlerDecorator("clearFieldChange")
  async clearFieldChange(payload: { field: string }): Promise<void> {
    const { field } = payload;
    const changes = this.getState("masterDataChanges") as MasterDataChanges;
    if (changes && changes[field as keyof MasterDataChanges]) {
      const newChanges = { ...changes };
      delete newChanges[field as keyof MasterDataChanges];
      this.setState("masterDataChanges", newChanges);
      this.setState("hasChanges", Object.keys(newChanges).length > 0);
    }
  }

  @HandlerDecorator("setPendingSubmitData")
  async setPendingSubmitData(payload: {
    data: Record<string, unknown>;
  }): Promise<void> {
    this.setState("pendingSubmitData", payload.data);
  }

  @HandlerDecorator("showUpdateConfirm")
  async showUpdateConfirm(): Promise<void> {
    this.setState("showUpdateConfirmModal", true);
  }

  @HandlerDecorator("hideUpdateConfirm")
  async hideUpdateConfirm(): Promise<void> {
    this.setState("showUpdateConfirmModal", false);
    this.setState("pendingSubmitData", null);
  }

  @HandlerDecorator("confirmMasterDataUpdate")
  async confirmMasterDataUpdate(payload: {
    useNewValues: boolean;
  }): Promise<void> {
    const { useNewValues } = payload;
    const pendingData = this.getState("pendingSubmitData") as Record<
      string,
      unknown
    > | null;
    const editingEntry = this.getState("editingEntry");

    if (!pendingData || !editingEntry) {
      this.setState("showUpdateConfirmModal", false);
      return;
    }

    // If user wants to keep old values, restore original danhMuc
    if (!useNewValues && editingEntry.danhMuc) {
      const originalDanhMuc = editingEntry.danhMuc;
      const currentDanhMuc = (pendingData.danhMuc as DanhMuc) || {};

      // Restore only the changed fields from original
      const changes = this.getState("masterDataChanges") as MasterDataChanges;
      if (changes.doiTuong && originalDanhMuc.doiTuong) {
        currentDanhMuc.doiTuong = originalDanhMuc.doiTuong;
      }
      if (changes.duAn && originalDanhMuc.duAn) {
        currentDanhMuc.duAn = originalDanhMuc.duAn;
      }
      if (changes.boPhan && originalDanhMuc.boPhan) {
        currentDanhMuc.boPhan = originalDanhMuc.boPhan;
      }
      if (changes.doi && originalDanhMuc.doi) {
        currentDanhMuc.doi = originalDanhMuc.doi;
      }
      if (changes.nhanVien && originalDanhMuc.nhanVien) {
        currentDanhMuc.nhanVien = originalDanhMuc.nhanVien;
      }
      if (changes.sanPham && originalDanhMuc.sanPham) {
        currentDanhMuc.sanPham = originalDanhMuc.sanPham;
      }
      if (changes.dongTien && originalDanhMuc.dongTien) {
        currentDanhMuc.dongTien = originalDanhMuc.dongTien;
      }

      pendingData.danhMuc = currentDanhMuc;
    }

    // Execute the update
    await this.executeEvent("updateEntry", {
      id: editingEntry.id,
      data: {
        ngay: pendingData.ngay as string,
        ngayGhiSo: pendingData.ngayGhiSo as string,
        soTien: pendingData.soTien as number,
        noiDung: pendingData.noiDung as string,
        danhMuc: pendingData.danhMuc as DanhMuc,
      },
    });

    this.setState("showUpdateConfirmModal", false);
    this.setState("pendingSubmitData", null);
  }

  @HandlerDecorator("confirmMasterDataUpdateSelective")
  async confirmMasterDataUpdateSelective(payload: {
    selectedUpdates: Record<string, boolean>;
  }): Promise<void> {
    const { selectedUpdates } = payload;
    const pendingData = this.getState("pendingSubmitData");
    const editingEntry = this.getState("editingEntry");

    if (!pendingData || !editingEntry) {
      this.setState("showUpdateConfirmModal", false);
      return;
    }

    const originalDanhMuc = editingEntry.danhMuc || {};
    const currentDanhMuc = (pendingData.danhMuc as DanhMuc) || {};
    const changes = this.getState("masterDataChanges") as MasterDataChanges;

    // For each changed field, if not selected for update, restore original value from database
    const fieldsToCheck = [
      "doiTuong",
      "duAn",
      "boPhan",
      "doi",
      "nhanVien",
      "sanPham",
      "dongTien",
    ] as const;

    for (const field of fieldsToCheck) {
      if (changes[field] && !selectedUpdates[field]) {
        // User chose to keep old value - restore from original database value
        const originalValue = originalDanhMuc[field];
        if (originalValue) {
          (currentDanhMuc as Record<string, unknown>)[field] = originalValue;
        } else {
          // If original was empty, remove the field
          delete (currentDanhMuc as Record<string, unknown>)[field];
        }
      }
    }

    pendingData.danhMuc = currentDanhMuc;

    // Execute the update
    await this.executeEvent("updateEntry", {
      id: editingEntry.id,
      data: {
        ngay: pendingData.ngay as string,
        ngayGhiSo: pendingData.ngayGhiSo as string,
        soTien: pendingData.soTien as number,
        noiDung: pendingData.noiDung as string,
        danhMuc: pendingData.danhMuc as DanhMuc,
        diaChi: pendingData.diaChi as string,
        ghiChu: pendingData.ghiChu as string,
        nguoiGiaoDich: pendingData.nguoiGiaoDich as string,
      },
    });

    this.setState("showUpdateConfirmModal", false);
    this.setState("pendingSubmitData", null);
  }
}
