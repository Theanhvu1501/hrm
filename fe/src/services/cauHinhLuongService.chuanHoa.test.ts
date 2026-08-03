import { describe, it, expect } from "vitest";
import {
  chuanHoaLamThem,
  LAM_THEM_MAC_DINH,
  type CauHinhLamThem,
} from "./cauHinhLuongService";

describe("chuanHoaLamThem", () => {
  it("undefined giữ nguyên undefined — 'công ty CHƯA bật quỹ giờ' là trạng thái thật", () => {
    expect(chuanHoaLamThem(undefined)).toBeUndefined();
  });

  it("bồi đủ bốn trường P4.2b cho lamThem hình dạng P4.2a", () => {
    const p42a = {
      cheDoBu: "chi_nghi_bu",
      heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 },
      soThangHanDung: 6,
      khiHetHan: "quy_ra_tien",
    } as unknown as CauHinhLamThem;

    const kq = chuanHoaLamThem(p42a)!;

    expect(kq.uuTienLoai).toEqual(LAM_THEM_MAC_DINH.uuTienLoai);
    expect(kq.heSoTra).toEqual(LAM_THEM_MAC_DINH.heSoTra);
    expect(kq.mienThueChenh).toEqual(LAM_THEM_MAC_DINH.mienThueChenh);
    expect(kq.khungGioDem).toEqual(LAM_THEM_MAC_DINH.khungGioDem);
    // Giá trị công ty đã lưu KHÔNG bị mặc định đè.
    expect(kq.heSoTichQuy).toEqual({ ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 });
    expect(kq.soThangHanDung).toBe(6);
    expect(kq.khiHetHan).toBe("quy_ra_tien");
  });

  it("khungGioDem = null là lựa chọn hợp lệ, KHÔNG bị bồi thành 22:00–06:00", () => {
    const kq = chuanHoaLamThem({ ...LAM_THEM_MAC_DINH, khungGioDem: null })!;
    expect(kq.khungGioDem).toBeNull();
  });

  it("không đụng gì khi lamThem đã đủ trường", () => {
    expect(chuanHoaLamThem(LAM_THEM_MAC_DINH)).toEqual(LAM_THEM_MAC_DINH);
  });
});
