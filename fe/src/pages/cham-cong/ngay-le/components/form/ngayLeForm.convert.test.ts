import { describe, it, expect } from "vitest";
import { Holiday } from "@/services/holidayService";
import {
  NGAY_LE_FORM_DEFAULT_VALUES,
  formValuesToCreateDto,
  holidayToFormValues,
} from "./ngayLeForm.convert";

const HOLIDAY: Holiday = {
  id: "h1",
  ten: "Tết Nguyên đán 2027",
  tuNgay: "2027-02-06",
  denNgay: "2027-02-10",
  nam: 2027,
  loai: "le",
  huongLuong: true,
  moTa: "Nghỉ Tết",
  isActive: true,
};

describe("holidayToFormValues", () => {
  it("trả về giá trị mặc định khi không có holiday (thêm mới)", () => {
    expect(holidayToFormValues(null)).toEqual(NGAY_LE_FORM_DEFAULT_VALUES);
  });

  it("map đúng các trường khi sửa, gộp tuNgay/denNgay thành khoang", () => {
    expect(holidayToFormValues(HOLIDAY)).toEqual({
      ten: "Tết Nguyên đán 2027",
      khoang: ["2027-02-06", "2027-02-10"],
      loai: "le",
      huongLuong: true,
      moTa: "Nghỉ Tết",
    });
  });

  it("moTa rỗng thành chuỗi rỗng, không phải undefined", () => {
    const noMoTa: Holiday = { ...HOLIDAY, moTa: undefined };
    expect(holidayToFormValues(noMoTa).moTa).toBe("");
  });
});

describe("formValuesToCreateDto", () => {
  it("tách khoang thành tuNgay/denNgay riêng cho DTO", () => {
    const dto = formValuesToCreateDto({
      ten: "Quốc khánh",
      khoang: ["2026-09-02", "2026-09-02"],
      loai: "le",
      huongLuong: true,
      moTa: "",
    });

    expect(dto).toEqual({
      ten: "Quốc khánh",
      tuNgay: "2026-09-02",
      denNgay: "2026-09-02",
      loai: "le",
      huongLuong: true,
      moTa: undefined,
    });
  });

  it("nghỉ một ngày thì tuNgay === denNgay (hai đầu trùng nhau)", () => {
    const dto = formValuesToCreateDto({
      ten: "Giỗ Tổ",
      khoang: ["2026-04-26", "2026-04-26"],
      loai: "le",
      huongLuong: true,
    });
    expect(dto.tuNgay).toBe(dto.denNgay);
  });

  it("moTa rỗng chuyển thành undefined để BE không lưu chuỗi rỗng", () => {
    const dto = formValuesToCreateDto({
      ten: "X",
      khoang: ["2026-01-01", "2026-01-01"],
      loai: "nghi_cty",
      huongLuong: false,
      moTa: "",
    });
    expect(dto.moTa).toBeUndefined();
  });

  it("ném lỗi khi chưa chọn khoảng ngày", () => {
    expect(() =>
      formValuesToCreateDto({
        ten: "X",
        khoang: null,
        loai: "le",
        huongLuong: true,
      })
    ).toThrow();
  });
});
