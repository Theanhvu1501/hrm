import { describe, it, expect } from "vitest";
import type { NguoiDung } from "@/types";
import type { WorkShift } from "@/services/workShiftService";
import {
  NGAY_TRONG_TUAN_OPTIONS,
  nguoiDungToUserOptions,
  workShiftToOptions,
  choPhepChamNgoaiVungToDto,
} from "./chamCongTab.convert";

describe("NGAY_TRONG_TUAN_OPTIONS", () => {
  it("xếp hiển thị T2→CN", () => {
    expect(NGAY_TRONG_TUAN_OPTIONS.map((o) => o.label)).toEqual([
      "T2",
      "T3",
      "T4",
      "T5",
      "T6",
      "T7",
      "CN",
    ]);
  });

  it("value khớp đúng quy ước Date.getDay() (0=CN…6=T7), không sắp theo value", () => {
    const byLabel = Object.fromEntries(
      NGAY_TRONG_TUAN_OPTIONS.map((o) => [o.label, o.value])
    );
    expect(byLabel).toEqual({
      CN: 0,
      T2: 1,
      T3: 2,
      T4: 3,
      T5: 4,
      T6: 5,
      T7: 6,
    });
  });

  it("mỗi value đúng bằng Date.getDay() của một ngày thật trong tuần đó", () => {
    // 2026-07-19 là Chủ nhật, 2026-07-20 là Thứ hai, ...
    const days = [
      "2026-07-19", // CN
      "2026-07-20", // T2
      "2026-07-21", // T3
      "2026-07-22", // T4
      "2026-07-23", // T5
      "2026-07-24", // T6
      "2026-07-25", // T7
    ];
    const gotDay = days.map((d) => new Date(`${d}T12:00:00`).getDay());
    // gotDay: [0,1,2,3,4,5,6] — đúng dải giá trị dùng trong NGAY_TRONG_TUAN_OPTIONS
    expect(gotDay).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const values = NGAY_TRONG_TUAN_OPTIONS.map((o) => o.value).sort((a, b) => a - b);
    expect(values).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("nguoiDungToUserOptions", () => {
  it("dùng nd.id làm value — đây là sub của identity, không phải id nội bộ khác", () => {
    const list: NguoiDung[] = [
      {
        id: "sso-sub-123",
        hoTen: "Nguyễn Văn A",
        email: "a@example.com",
        vaiTro: "KIEM_SOAT",
        tenants: [],
        trangThai: "HOAT_DONG",
        isActive: true,
      },
    ];
    expect(nguoiDungToUserOptions(list)).toEqual([
      { value: "sso-sub-123", label: "Nguyễn Văn A — a@example.com" },
    ]);
  });

  it("trả về mảng rỗng khi danh sách rỗng", () => {
    expect(nguoiDungToUserOptions([])).toEqual([]);
  });
});

describe("workShiftToOptions", () => {
  it("gộp tên ca và khung giờ vào label", () => {
    const list: WorkShift[] = [
      {
        id: "ws1",
        ten: "Ca hành chính",
        gioBatDau: "08:00",
        gioKetThuc: "17:00",
        laCaQuaDem: false,
        laLinhHoat: false,
        isActive: true,
      },
    ];
    expect(workShiftToOptions(list)).toEqual([
      { value: "ws1", label: "Ca hành chính (08:00–17:00)" },
    ]);
  });
});

describe("choPhepChamNgoaiVungToDto", () => {
  // Bẫy P3.1: `JSON.stringify` (dùng ở ServiceBase khi gửi request) loại
  // hẳn khoá mang giá trị `undefined` khỏi body. Nếu hàm này để lọt
  // `undefined` khi form chưa từng có trường, hoặc khi HR bỏ tick, thì BE
  // (Object.assign(item, dto)) sẽ giữ nguyên quyền "chấm ngoài vùng" đã cấp
  // trước đó — HR bấm lưu, thấy "Cập nhật thành công", nhưng nhân viên vẫn
  // chấm công được từ bất kỳ đâu.
  it("luôn gửi boolean cho choPhepChamNgoaiVung, kể cả khi tắt", () => {
    const kq = choPhepChamNgoaiVungToDto({ choPhepChamNgoaiVung: false } as any);
    expect(kq).toHaveProperty("choPhepChamNgoaiVung", false);
  });

  it("không có giá trị → gửi false, không gửi undefined", () => {
    const kq = choPhepChamNgoaiVungToDto({} as any);
    expect(kq.choPhepChamNgoaiVung).toBe(false);
  });

  it("bật công tắc thì gửi true", () => {
    const kq = choPhepChamNgoaiVungToDto({ choPhepChamNgoaiVung: true } as any);
    expect(kq.choPhepChamNgoaiVung).toBe(true);
  });

  it("kết quả luôn còn khoá choPhepChamNgoaiVung sau khi qua JSON.stringify (mô phỏng đúng ServiceBase)", () => {
    const kq = choPhepChamNgoaiVungToDto({ choPhepChamNgoaiVung: false } as any);
    const body = JSON.parse(JSON.stringify(kq));
    expect("choPhepChamNgoaiVung" in body).toBe(true);
    expect(body.choPhepChamNgoaiVung).toBe(false);
  });
});
