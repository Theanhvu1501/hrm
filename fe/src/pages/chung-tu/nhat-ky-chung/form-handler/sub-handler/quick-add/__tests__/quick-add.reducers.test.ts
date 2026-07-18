import { describe, it, expect } from "vitest";
import {
  quickAddDoiTuongReducer,
  quickAddSanPhamReducer,
} from "../quick-add.reducers";
import { ChungTuChiTiet } from "../../init/init.state";
import { DoiTuong, SanPham } from "@/types";

const row = (over: Partial<ChungTuChiTiet> = {}): ChungTuChiTiet => ({
  key: "r1",
  taiKhoanNo: "",
  taiKhoanCo: "",
  soTien: 0,
  noiDung: "",
  ...over,
});

describe("quickAddDoiTuongReducer", () => {
  const dt = { id: "d1", loai: ["KHACH_HANG"], ma: "KH001", ten: "Cty A", maSoThue: "" } as unknown as DoiTuong;

  it("append doiTuongList và set doiTuongId + snapshot khi field = doiTuongId", () => {
    const out = quickAddDoiTuongReducer({
      chiTietList: [row({ key: "a" })],
      doiTuongList: [],
      key: "a",
      field: "doiTuongId",
      created: dt,
    });
    expect(out.doiTuongList).toHaveLength(1);
    expect(out.chiTietList[0].doiTuongId).toBe("d1");
    expect((out.chiTietList[0].doiTuongSnapshot as { ma: string }).ma).toBe("KH001");
  });

  it("set doiTuong2Id + doiTuong2Snapshot khi field = doiTuong2Id", () => {
    const out = quickAddDoiTuongReducer({
      chiTietList: [row({ key: "a" })], doiTuongList: [], key: "a", field: "doiTuong2Id", created: dt,
    });
    expect(out.chiTietList[0].doiTuong2Id).toBe("d1");
    expect((out.chiTietList[0].doiTuong2Snapshot as { ma: string }).ma).toBe("KH001");
  });

  it("chỉ sửa đúng dòng theo key, dòng khác giữ nguyên", () => {
    const out = quickAddDoiTuongReducer({
      chiTietList: [row({ key: "a" }), row({ key: "b" })],
      doiTuongList: [], key: "b", field: "doiTuongId", created: dt,
    });
    expect(out.chiTietList[0].doiTuongId).toBeUndefined();
    expect(out.chiTietList[1].doiTuongId).toBe("d1");
  });
});

describe("quickAddSanPhamReducer", () => {
  const sp = { id: "s1", ma: "VT001", ten: "Xi măng", donVi: "Bao", giaBan: 90000 } as unknown as SanPham;

  it("append sanPhamList và set sanPhamId + snapshot vào đúng dòng", () => {
    const out = quickAddSanPhamReducer({
      chiTietList: [row({ key: "a" }), row({ key: "b" })],
      sanPhamList: [],
      key: "b",
      created: sp,
    });
    expect(out.sanPhamList).toHaveLength(1);
    expect(out.sanPhamList[0].ma).toBe("VT001");
    expect(out.chiTietList[0].sanPhamId).toBeUndefined();
    expect(out.chiTietList[1].sanPhamId).toBe("s1");
    expect((out.chiTietList[1].sanPhamSnapshot as { ma: string }).ma).toBe("VT001");
  });
});
