import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import { homNayVN, gioVN } from "@/ultils/thoiGianVN";
import {
  ngayTuongLaiBiChan,
  gioTuongLaiBiChan,
  formValuesToHrNhapDto,
} from "./nhapBuForm.convert";

describe("ngayTuongLaiBiChan", () => {
  it("chặn ngày ở tương lai", () => {
    expect(ngayTuongLaiBiChan(dayjs().add(2, "day"))).toBe(true);
  });

  it("không chặn hôm nay (giờ VN)", () => {
    expect(ngayTuongLaiBiChan(dayjs(homNayVN()))).toBe(false);
  });

  it("không chặn ngày trong quá khứ", () => {
    expect(ngayTuongLaiBiChan(dayjs().subtract(2, "day"))).toBe(false);
  });
});

describe("gioTuongLaiBiChan", () => {
  it("ngày null -> không chặn giờ nào", () => {
    const kq = gioTuongLaiBiChan(null);
    expect(kq.disabledHours()).toEqual([]);
    expect(kq.disabledMinutes(0)).toEqual([]);
  });

  it("ngày trong quá khứ -> không chặn giờ nào", () => {
    const homQua = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const kq = gioTuongLaiBiChan(homQua);
    expect(kq.disabledHours()).toEqual([]);
    expect(kq.disabledMinutes(23)).toEqual([]);
  });

  it("hôm nay -> chỉ chặn giờ SAU giờ hiện tại, không chặn đúng giờ hiện tại", () => {
    const [gioHienTai] = gioVN(new Date().toISOString()).split(":").map(Number);
    const kq = gioTuongLaiBiChan(homNayVN());
    const disabled = kq.disabledHours();
    expect(disabled.every((h) => h > gioHienTai)).toBe(true);
    expect(disabled).not.toContain(gioHienTai);
  });

  it("hôm nay, đúng giờ hiện tại -> chặn phút sau phút hiện tại", () => {
    const [gioHienTai, phutHienTai] = gioVN(new Date().toISOString())
      .split(":")
      .map(Number);
    const kq = gioTuongLaiBiChan(homNayVN());
    const disabledMinutes = kq.disabledMinutes(gioHienTai);
    expect(disabledMinutes.every((m) => m > phutHienTai)).toBe(true);
  });

  it("hôm nay, giờ khác giờ hiện tại -> không chặn phút nào", () => {
    const [gioHienTai] = gioVN(new Date().toISOString()).split(":").map(Number);
    const gioKhac = gioHienTai === 0 ? 1 : 0;
    const kq = gioTuongLaiBiChan(homNayVN());
    expect(kq.disabledMinutes(gioKhac)).toEqual([]);
  });
});

describe("formValuesToHrNhapDto", () => {
  const BASE = {
    employeeId: "e1",
    ngay: "2026-07-20",
    loai: "vao" as const,
    gio: "08:00",
    ghiChu: "  NV quên chấm, có xác nhận của quản lý  ",
  };

  it("map đúng các trường, cắt khoảng trắng ghiChu", () => {
    expect(formValuesToHrNhapDto(BASE)).toEqual({
      employeeId: "e1",
      ngay: "2026-07-20",
      loai: "vao",
      gio: "08:00",
      ghiChu: "NV quên chấm, có xác nhận của quản lý",
    });
  });

  it("ghiChu chỉ có khoảng trắng -> undefined, không gửi chuỗi rỗng", () => {
    const dto = formValuesToHrNhapDto({ ...BASE, ghiChu: "   " });
    expect(dto.ghiChu).toBeUndefined();
  });

  it("ghiChu không truyền -> undefined", () => {
    const { ghiChu: _bo, ...rest } = BASE;
    const dto = formValuesToHrNhapDto(rest);
    expect(dto.ghiChu).toBeUndefined();
  });

  it("thiếu employeeId -> ném lỗi", () => {
    expect(() => formValuesToHrNhapDto({ ...BASE, employeeId: "" })).toThrow();
  });

  it("thiếu ngay -> ném lỗi", () => {
    expect(() => formValuesToHrNhapDto({ ...BASE, ngay: null })).toThrow();
  });

  it("thiếu gio -> ném lỗi", () => {
    expect(() => formValuesToHrNhapDto({ ...BASE, gio: null })).toThrow();
  });
});
