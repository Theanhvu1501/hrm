import { ChungTuChiTiet } from "../init/init.state";
import { DoiTuong, SanPham } from "@/types";
import { buildDoiTuongSnapshot, buildSanPhamSnapshot } from "@/utils/snapshotBuilder";

export function quickAddDoiTuongReducer(input: {
  chiTietList: ChungTuChiTiet[];
  doiTuongList: DoiTuong[];
  key: string;
  field: "doiTuongId" | "doiTuong2Id";
  created: DoiTuong;
}): { chiTietList: ChungTuChiTiet[]; doiTuongList: DoiTuong[] } {
  const doiTuongList = [...input.doiTuongList, input.created];
  const snapshotField = input.field === "doiTuongId" ? "doiTuongSnapshot" : "doiTuong2Snapshot";
  const chiTietList = input.chiTietList.map((item) =>
    item.key === input.key
      ? { ...item, [input.field]: input.created.id, [snapshotField]: buildDoiTuongSnapshot(input.created) }
      : item
  );
  return { chiTietList, doiTuongList };
}

export function quickAddSanPhamReducer(input: {
  chiTietList: ChungTuChiTiet[];
  sanPhamList: SanPham[];
  key: string;
  created: SanPham;
}): { chiTietList: ChungTuChiTiet[]; sanPhamList: SanPham[] } {
  const sanPhamList = [...input.sanPhamList, input.created];
  const chiTietList = input.chiTietList.map((item) =>
    item.key === input.key
      ? { ...item, sanPhamId: input.created.id, sanPhamSnapshot: buildSanPhamSnapshot(input.created) }
      : item
  );
  return { chiTietList, sanPhamList };
}
