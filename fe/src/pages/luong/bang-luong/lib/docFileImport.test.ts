// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { docLuoiImport } from "./docFileImport";

/** Khoản nhập tay của công ty, dùng để khớp tiêu đề cột. */
const KHOAN = [
  { ma: "HIEU_SUAT", ten: "Hiệu suất" },
  { ma: "THUONG", ten: "Thưởng" },
];

describe("docLuoiImport", () => {
  it("khớp cột theo TÊN khoản ở dòng tiêu đề", () => {
    const luoi = [
      ["Mã NV", "Họ tên", "Hiệu suất", "Thưởng"],
      ["NV0001", "Đào Thị Kiều Oanh", 2000000, 500000],
    ];

    const { dong, loi } = docLuoiImport(luoi, KHOAN);

    expect(loi).toEqual([]);
    expect(dong).toEqual([
      {
        maNhanVien: "NV0001",
        hoTen: "Đào Thị Kiều Oanh",
        giaTri: { HIEU_SUAT: 2000000, THUONG: 500000 },
      },
    ]);
  });

  it("khớp được cả theo MÃ khoản, phòng khi người dùng đổi tiêu đề", () => {
    const luoi = [
      ["Mã NV", "HIEU_SUAT"],
      ["NV0001", 1000],
    ];

    expect(docLuoiImport(luoi, KHOAN).dong[0].giaTri).toEqual({
      HIEU_SUAT: 1000,
    });
  });

  it("bỏ qua cột lạ thay vì làm hỏng cả file", () => {
    // Người ta hay để lại cột ghi chú, cột tính tay trong file. Ném lỗi vì
    // một cột thừa là bắt họ dọn file trước khi dùng được.
    const luoi = [
      ["Mã NV", "Hiệu suất", "Ghi chú"],
      ["NV0001", 1000, "thưởng nóng"],
    ];

    const { dong, loi } = docLuoiImport(luoi, KHOAN);
    expect(dong[0].giaTri).toEqual({ HIEU_SUAT: 1000 });
    expect(loi).toEqual([]);
  });

  it("số có dấu phân cách nghìn và khoảng trắng vẫn đọc được", () => {
    const luoi = [
      ["Mã NV", "Hiệu suất"],
      ["NV0001", " 2,000,000 "],
    ];

    expect(docLuoiImport(luoi, KHOAN).dong[0].giaTri.HIEU_SUAT).toBe(2000000);
  });

  it("ô trống = KHÔNG import khoản đó, khác hẳn với số 0", () => {
    // Để trống nghĩa là "không đụng tới", còn 0 nghĩa là "đặt về 0". Gộp hai
    // thứ này lại là ghi đè mất số kế toán đã nhập tay từ trước.
    const luoi = [
      ["Mã NV", "Hiệu suất", "Thưởng"],
      ["NV0001", "", 0],
    ];

    expect(docLuoiImport(luoi, KHOAN).dong[0].giaTri).toEqual({ THUONG: 0 });
  });

  it("bỏ dòng trống hoàn toàn ở cuối file", () => {
    const luoi = [
      ["Mã NV", "Hiệu suất"],
      ["NV0001", 1000],
      ["", ""],
      [],
    ];

    expect(docLuoiImport(luoi, KHOAN).dong).toHaveLength(1);
  });

  it("dòng có số nhưng THIẾU mã nhân viên → báo lỗi kèm số dòng trong file", () => {
    const luoi = [
      ["Mã NV", "Hiệu suất"],
      ["", 1000],
    ];

    const { dong, loi } = docLuoiImport(luoi, KHOAN);
    expect(dong).toEqual([]);
    expect(loi[0]).toMatch(/dòng 2/i);
  });

  it("giá trị không đọc được thành số → báo lỗi kèm số dòng", () => {
    const luoi = [
      ["Mã NV", "Hiệu suất"],
      ["NV0001", "hai triệu"],
    ];

    const { loi } = docLuoiImport(luoi, KHOAN);
    expect(loi[0]).toMatch(/dòng 2/i);
  });

  it("thiếu hẳn cột Mã NV → báo lỗi rõ, không đoán cột đầu tiên", () => {
    const luoi = [
      ["Họ tên", "Hiệu suất"],
      ["Đào Thị Kiều Oanh", 1000],
    ];

    const { dong, loi } = docLuoiImport(luoi, KHOAN);
    expect(dong).toEqual([]);
    expect(loi[0]).toMatch(/Mã NV/i);
  });

  it("không có cột khoản nào khớp → báo lỗi, không import file rỗng nghĩa", () => {
    const luoi = [
      ["Mã NV", "Họ tên"],
      ["NV0001", "A"],
    ];

    const { loi } = docLuoiImport(luoi, KHOAN);
    expect(loi[0]).toMatch(/khoản/i);
  });
});
