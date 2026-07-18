// Types for master data comparison
export type ChangeStatus = "changed" | "deleted" | "unchanged";

export interface MasterDataChangeItem {
  field: string;
  label: string;
  oldValue: string;
  newValue: string | null;
  status: ChangeStatus;
}

export interface MasterDataChanges {
  doiTuong?: MasterDataChangeItem;
  doiTuong2?: MasterDataChangeItem;
  duAn?: MasterDataChangeItem;
  boPhan?: MasterDataChangeItem;
  doi?: MasterDataChangeItem;
  nhanVien?: MasterDataChangeItem;
  sanPham?: MasterDataChangeItem;
  dongTien?: MasterDataChangeItem;
  nhomKhuyenMai?: MasterDataChangeItem;
  nhomQuanLy?: MasterDataChangeItem;
}

export const FIELD_LABELS: Record<string, string> = {
  doiTuong: "Đối tượng",
  doiTuong2: "Đối tượng 2",
  duAn: "Dự án",
  boPhan: "Bộ phận",
  doi: "Đội",
  nhanVien: "Nhân viên",
  sanPham: "Sản phẩm",
  dongTien: "Dòng tiền",
  nhomKhuyenMai: "Nhóm khuyến mại",
  nhomQuanLy: "Nhóm quản lý",
};
