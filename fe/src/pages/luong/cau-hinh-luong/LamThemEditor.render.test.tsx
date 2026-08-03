// @vitest-environment jsdom
/**
 * Tab "Làm thêm & quỹ giờ" của màn Cấu hình lương (review nhánh, IMPORTANT 6).
 *
 * Trước bản vá, `grep -rn "lamThem\|soGioMoiNgay" fe/src` không ra gì: runbook
 * `ops/README.md` bước 3 bảo vận hành "vào màn Cấu hình lương điền và lưu tay"
 * một thứ màn hình chưa hề có. Hệ quả: mọi tenant đã dùng bảng lương trước
 * P4.2a không có đường nào bật quỹ giờ.
 */
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { hoTen: "Trần Thị HR" },
    hasPermission: () => true,
  }),
}));

import CauHinhLuongPage from "./CauHinhLuongPage";
import {
  cauHinhLuongService,
  CauHinhLuong,
  LAM_THEM_MAC_DINH,
} from "@/services/cauHinhLuongService";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

afterEach(() => vi.restoreAllMocks());

/** Bản ghi của tenant tạo TRƯỚC P4.2a: không có `lamThem`/`soGioMoiNgay`. */
const cauHinhCu: CauHinhLuong = {
  id: "1",
  mucKhaiBaoMacDinh: 5_000_000,
  congChuan: 26,
  khoanLuong: [],
  giamTruBanThan: 11_000_000,
  giamTruNPT: 4_400_000,
  bhxh: { tyLe: 0.105, canCu: "MUC_KHAI_BAO" },
  bacThue: [{ den: null, suat: 0.35 }],
  thuViec: { tyLe: 0.85 },
  quyTacThoiVu: { tyLe: 0.1, nguong: 3_000_000 },
  quyTacCamKet: { mienThue: false },
  bhCongTy: { tyLe: 0.215, tyLeHopDongThu2: 0.005 },
  lamTron: 1_000,
};

async function moTabLamThem(
  cauHinh: CauHinhLuong,
  demDon: Record<string, number> = {},
) {
  vi.spyOn(cauHinhLuongService, "get").mockResolvedValue(cauHinh);
  vi.spyOn(cauHinhLuongService, "demDonTheoLoaiOt").mockResolvedValue(demDon);
  const kq = render(<CauHinhLuongPage />);
  await screen.findByText("Làm thêm & quỹ giờ");
  fireEvent.click(screen.getByText("Làm thêm & quỹ giờ"));
  return kq;
}

describe("Tab Làm thêm & quỹ giờ", () => {
  it("tenant CHƯA bật: nói rõ chưa bật + cảnh báo phải báo HR trước", async () => {
    await moTabLamThem(cauHinhCu);

    expect(
      await screen.findByText(/Công ty chưa bật quỹ giờ làm thêm/),
    ).toBeTruthy();
    // Cảnh báo này là bắt buộc chứ không phải lời khuyên: bật = chặn nộp
    // nghỉ bù toàn công ty cho tới đơn OT đầu tiên được duyệt.
    expect(screen.getByText(/Báo HR TRƯỚC khi bật/)).toBeTruthy();
    expect(screen.getByText("Bật quỹ giờ làm thêm")).toBeTruthy();
  });

  it("bấm Bật thì điền sẵn sàng BLLĐ và hiện đủ ô để sửa trước khi Lưu", async () => {
    await moTabLamThem(cauHinhCu);

    fireEvent.click(await screen.findByText("Bật quỹ giờ làm thêm"));

    await waitFor(() => {
      expect(screen.getByText(/Quỹ giờ làm thêm đang bật/)).toBeTruthy();
    });
    // Hệ số mặc định = đúng sàn BLLĐ 2019 Đ98.1. `step={0.5}` nên antd
    // InputNumber hiện một chữ số thập phân ("2.0", không phải "2").
    // `getAllBy…`: từ P4.2b mỗi loại ngày có HAI ô (trả tiền / tích quỹ), nên
    // 1.5 xuất hiện 4 lần (ngay_thuong ×2, ngay_dem ×2).
    expect(screen.getAllByDisplayValue("1.5").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("2.0").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("3.0").length).toBeGreaterThan(0);
    // soGioMoiNgay mặc định 8 — con số quy đổi ngày↔giờ cho nghỉ bù.
    expect(screen.getByDisplayValue("8.0")).toBeTruthy();
  });

  it("tenant ĐÃ bật: hiện đúng giá trị đã lưu, không phải mặc định", async () => {
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 7.5,
      lamThem: {
        ...LAM_THEM_MAC_DINH,
        heSoTichQuy: { ngay_thuong: 2, ngay_nghi: 2.5, ngay_le: 3.5, ngay_dem: 2 },
        soThangHanDung: 6,
        khiHetHan: "huy_bo",
      },
    });

    expect(await screen.findByDisplayValue("7.5")).toBeTruthy();
    expect(screen.getAllByDisplayValue("2.5").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("3.5").length).toBeGreaterThan(0);
    // soThangHanDung khác null ⇒ ô số tháng phải hiện ra.
    expect(screen.getByDisplayValue("6")).toBeTruthy();
  });

  it("soThangHanDung = null (không hết hạn) thì KHÔNG hiện ô số tháng", async () => {
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 8,
      lamThem: { ...LAM_THEM_MAC_DINH, soThangHanDung: null },
    });

    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    expect(screen.queryByText("Số tháng còn hiệu lực")).toBeNull();
  });
});

describe("Tab Làm thêm & quỹ giờ — bảng hệ số (P4.2b)", () => {
  it("hiện một dòng cho MỖI loại trong uuTienLoai, kể cả Buổi đêm", async () => {
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 8,
      lamThem: LAM_THEM_MAC_DINH,
    });

    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    expect(screen.getByText("Ngày lễ / Tết")).toBeTruthy();
    expect(screen.getByText("Ngày nghỉ hằng tuần")).toBeTruthy();
    expect(screen.getByText("Buổi đêm")).toBeTruthy();
    expect(screen.getByText("Ngày thường")).toBeTruthy();
  });

  it("loại do công ty tự thêm hiện bằng CHÍNH KHOÁ của nó, không bị bỏ sót", async () => {
    // Thà hiện một khoá xấu còn hơn ẩn mất một dòng hệ số đang có hiệu lực.
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 8,
      lamThem: {
        ...LAM_THEM_MAC_DINH,
        uuTienLoai: [...LAM_THEM_MAC_DINH.uuTienLoai, "ngay_bao"],
        heSoTra: { ...LAM_THEM_MAC_DINH.heSoTra, ngay_bao: 2.5 },
        heSoTichQuy: { ...LAM_THEM_MAC_DINH.heSoTichQuy, ngay_bao: 2.5 },
      },
    });

    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    expect(screen.getByText("ngay_bao")).toBeTruthy();
  });

  it("có ca đêm: hiện khung giờ ban đêm đã lưu", async () => {
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 8,
      lamThem: { ...LAM_THEM_MAC_DINH, khungGioDem: { tu: "21:00", den: "05:00" } },
    });

    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    expect(screen.getByText("Khung giờ ban đêm")).toBeTruthy();
    expect(screen.getByDisplayValue("21:00")).toBeTruthy();
    expect(screen.getByDisplayValue("05:00")).toBeTruthy();
  });

  it("khungGioDem = null (không có ca đêm) thì ẩn hẳn khối khung giờ", async () => {
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 8,
      lamThem: { ...LAM_THEM_MAC_DINH, khungGioDem: null },
    });

    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    expect(screen.queryByText("Khung giờ ban đêm")).toBeNull();
  });
});

/**
 * Ca suýt làm trắng trang lúc deploy P4.2b: tenant đã bật quỹ giờ từ P4.2a có
 * `lamThem` KHÔNG có `uuTienLoai`/`heSoTra`/`khungGioDem`/`mienThueChenh`
 * (server chỉ seed khi chưa có hàng nào, không vá bản ghi đã lưu). Bảng hệ số
 * gọi `lamThem.uuTienLoai.map(...)` → ném lúc render → repo không có
 * ErrorBoundary nên trắng TOÀN trang Cấu hình lương.
 */
describe("Tab Làm thêm & quỹ giờ — lamThem hình dạng P4.2a (thiếu trường P4.2b)", () => {
  const lamThemP42a = {
    cheDoBu: "chi_nghi_bu",
    heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 },
    soThangHanDung: 6,
    khiHetHan: "quy_ra_tien",
  } as never;

  it("KHÔNG trắng trang — bồi mặc định và vẫn hiện đủ bảng hệ số", async () => {
    await moTabLamThem({ ...cauHinhCu, soGioMoiNgay: 8, lamThem: lamThemP42a });

    expect(await screen.findByText(/Quỹ giờ làm thêm đang bật/)).toBeTruthy();
    expect(screen.getByText("Ngày lễ / Tết")).toBeTruthy();
    // `ngay_dem` không có trong heSoTichQuy đã lưu → bồi từ mặc định, không
    // được biến mất khỏi bảng.
    expect(screen.getByText("Buổi đêm")).toBeTruthy();
    // Giá trị công ty ĐÃ lưu phải giữ nguyên, không bị mặc định đè.
    expect(screen.getByDisplayValue("6")).toBeTruthy(); // soThangHanDung
  });
});

describe("Tab Làm thêm & quỹ giờ — thêm/xoá/đổi thứ tự loại ngày (P4.2b §6)", () => {
  const mo = (demDon: Record<string, number> = {}) =>
    moTabLamThem(
      { ...cauHinhCu, soGioMoiNgay: 8, lamThem: LAM_THEM_MAC_DINH },
      demDon,
    );

  it("thêm được loại ngày mới, và nó vào CUỐI danh sách ưu tiên", async () => {
    await mo();
    await screen.findByText(/Quỹ giờ làm thêm đang bật/);

    fireEvent.change(screen.getByLabelText("Mã loại ngày mới"), {
      target: { value: "ngay_bao" },
    });
    fireEvent.click(screen.getByText("Thêm loại ngày"));

    await waitFor(() => expect(screen.getByText("ngay_bao")).toBeTruthy());
    // Vào cuối ⇒ nút "Xuống" của nó phải bị khoá (không còn dòng nào dưới).
    expect(
      screen.getByLabelText("Xuống ngay_bao").closest("button")!.disabled,
    ).toBe(true);
  });

  it("chặn mã sai định dạng và mã trùng — nút Thêm bị khoá", async () => {
    await mo();
    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    const o = screen.getByLabelText("Mã loại ngày mới");

    fireEvent.change(o, { target: { value: "Ngày Bão" } });
    expect(screen.getByText("Thêm loại ngày").closest("button")!.disabled).toBe(true);

    fireEvent.change(o, { target: { value: "ngay_dem" } }); // đã có
    expect(screen.getByText("Thêm loại ngày").closest("button")!.disabled).toBe(true);

    fireEvent.change(o, { target: { value: "ngay_bao" } });
    expect(screen.getByText("Thêm loại ngày").closest("button")!.disabled).toBe(false);
  });

  it("CHẶN xoá loại đang được đơn tham chiếu", async () => {
    await mo({ ngay_dem: 3 });
    await screen.findByText(/Quỹ giờ làm thêm đang bật/);

    await waitFor(() =>
      expect(screen.getByLabelText("Xoá ngay_dem").closest("button")!.disabled).toBe(true),
    );
    // Loại không có đơn nào thì vẫn xoá được.
    expect(screen.getByLabelText("Xoá ngay_le").closest("button")!.disabled).toBe(false);
  });

  it("xoá loại thì mất khỏi bảng", async () => {
    await mo();
    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    expect(screen.getByText("Buổi đêm")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Xoá ngay_dem"));

    await waitFor(() => expect(screen.queryByText("Buổi đêm")).toBeNull());
  });

  it("đổi thứ tự ưu tiên bằng nút lên/xuống", async () => {
    await mo();
    await screen.findByText(/Quỹ giờ làm thêm đang bật/);

    // Mặc định lễ đứng đầu ⇒ nút "Lên" của nó bị khoá.
    expect(screen.getByLabelText("Lên ngay_le").closest("button")!.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("Lên ngay_nghi"));

    // Sau khi đảo, ngày nghỉ lên đầu nên tới lượt NÓ bị khoá nút "Lên".
    await waitFor(() =>
      expect(screen.getByLabelText("Lên ngay_nghi").closest("button")!.disabled).toBe(true),
    );
    expect(screen.getByLabelText("Lên ngay_le").closest("button")!.disabled).toBe(false);
  });
});

describe("Tab Làm thêm & quỹ giờ — bốn chế độ bù (P4.2c-2)", () => {
  it("cảnh báo phải chốt bảng thêm giờ khi chọn chế độ có trả tiền", async () => {
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 8,
      lamThem: { ...LAM_THEM_MAC_DINH, cheDoBu: "chi_tien" },
    });

    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    expect(screen.getByText(/phải chốt màn “Bảng lương thêm giờ”/)).toBeTruthy();
  });

  it("chế độ chỉ nghỉ bù KHÔNG hiện cảnh báo đó — bảng lương không trả tiền OT", async () => {
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 8,
      lamThem: { ...LAM_THEM_MAC_DINH, cheDoBu: "chi_nghi_bu" },
    });

    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    expect(screen.queryByText(/phải chốt màn “Bảng lương thêm giờ”/)).toBeNull();
  });

  it("nghi_bu_va_chenh cảnh báo ràng buộc hệ số tích quỹ = 1,0", async () => {
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 8,
      lamThem: { ...LAM_THEM_MAC_DINH, cheDoBu: "nghi_bu_va_chenh" },
    });

    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    expect(screen.getByText(/trả gấp đôi cho cùng một giờ công/)).toBeTruthy();
  });
});
