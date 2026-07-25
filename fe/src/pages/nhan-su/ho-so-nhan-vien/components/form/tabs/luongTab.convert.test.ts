import { describe, it, expect } from "vitest";
import {
  cauHinhLuongRiengToDto,
  cauHinhLuongRiengToForm,
} from "./luongTab.convert";
import type { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";

const BASE = {} as HoSoNhanVienFormValues;

describe("cauHinhLuongRiengToDto", () => {
  it("không nhập gì → cauHinhLuongRieng = {} (xoá được cấu hình riêng cũ)", () => {
    expect(cauHinhLuongRiengToDto({ ...BASE })).toEqual({
      hopDongThu2: false,
      cauHinhLuongRieng: {},
    });
  });

  it("quy đổi % sang tỷ lệ 0..1", () => {
    const r = cauHinhLuongRiengToDto({
      ...BASE,
      orCongChuan: 26,
      orThuViecPhanTram: 90,
      orBhxhPhanTram: 10.5,
      orBhxhCanCu: "LUONG_THOA_THUAN",
    });
    expect(r.cauHinhLuongRieng).toEqual({
      congChuan: 26,
      thuViecTyLe: 0.9,
      bhxhTyLe: 0.105,
      bhxhCanCu: "LUONG_THOA_THUAN",
    });
  });

  it("0% là giá trị hợp lệ, không bị bỏ qua", () => {
    const r = cauHinhLuongRiengToDto({ ...BASE, orThuViecPhanTram: 0 });
    expect(r.cauHinhLuongRieng).toEqual({ thuViecTyLe: 0 });
  });

  it("ô để trống thì KHÔNG có khoá đó trong payload (kế thừa cấu hình chung)", () => {
    const r = cauHinhLuongRiengToDto({ ...BASE, orCongChuan: 26 });
    expect(r.cauHinhLuongRieng).toEqual({ congChuan: 26 });
    expect(r.cauHinhLuongRieng).not.toHaveProperty("thuViecTyLe");
  });

  it("hopDongThu2 giữ đúng false/true, không nuốt false", () => {
    expect(
      cauHinhLuongRiengToDto({ ...BASE, hopDongThu2: false }).hopDongThu2
    ).toBe(false);
    expect(
      cauHinhLuongRiengToDto({ ...BASE, hopDongThu2: true }).hopDongThu2
    ).toBe(true);
  });
});

describe("cauHinhLuongRiengToForm", () => {
  it("tỷ lệ → %, trường vắng mặt để undefined", () => {
    expect(
      cauHinhLuongRiengToForm({ congChuan: 26, thuViecTyLe: 0.9 })
    ).toEqual({
      orCongChuan: 26,
      orThuViecPhanTram: 90,
      orBhxhPhanTram: undefined,
      orBhxhCanCu: undefined,
    });
  });

  it("undefined/rỗng → tất cả undefined", () => {
    expect(cauHinhLuongRiengToForm(undefined)).toEqual({
      orCongChuan: undefined,
      orThuViecPhanTram: undefined,
      orBhxhPhanTram: undefined,
      orBhxhCanCu: undefined,
    });
  });

  it("tỷ lệ 0 → 0%, không thành undefined", () => {
    expect(cauHinhLuongRiengToForm({ thuViecTyLe: 0 }).orThuViecPhanTram).toBe(
      0
    );
  });

  it("khứ hồi form → dto → form giữ nguyên giá trị", () => {
    const form = {
      ...BASE,
      orCongChuan: 26,
      orThuViecPhanTram: 90,
      orBhxhPhanTram: 10.5,
      orBhxhCanCu: "MUC_KHAI_BAO" as const,
    };
    const { cauHinhLuongRieng } = cauHinhLuongRiengToDto(form);
    expect(cauHinhLuongRiengToForm(cauHinhLuongRieng)).toEqual({
      orCongChuan: 26,
      orThuViecPhanTram: 90,
      orBhxhPhanTram: 10.5,
      orBhxhCanCu: "MUC_KHAI_BAO",
    });
  });
});
