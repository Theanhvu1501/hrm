import { describe, it, expect } from "vitest";
import { AttendanceRequest } from "@/services/attendanceRequestService";
import { khoangNgay, khungGio, soLieuDon } from "./hienThiDon";

function don(over: Partial<AttendanceRequest> = {}): AttendanceRequest {
  return {
    id: "d1",
    employeeId: "nv1",
    loaiDon: "giai_trinh",
    ngay: "2026-08-03",
    trangThai: "cho_duyet",
    isActive: true,
    ...over,
  };
}

describe("khoangNgay — cột Ngày của bảng HR", () => {
  it("đơn một ngày chỉ hiện một ngày", () => {
    expect(khoangNgay(don({ ngay: "2026-08-03" }))).toBe("2026-08-03");
  });

  it("denNgay bằng ngay KHÔNG hiện thành khoảng (đọc như lỗi hiển thị)", () => {
    expect(
      khoangNgay(don({ ngay: "2026-08-03", denNgay: "2026-08-03" }))
    ).toBe("2026-08-03");
  });

  it("đơn nghỉ nhiều ngày hiện cả hai đầu", () => {
    expect(
      khoangNgay(don({ ngay: "2026-08-03", denNgay: "2026-08-05" }))
    ).toBe("2026-08-03 → 2026-08-05");
  });

  it("thiếu ngày thì trả '-' chứ không trả chuỗi rỗng", () => {
    expect(khoangNgay(don({ ngay: "" }))).toBe("-");
  });
});

describe("khungGio — cột Giờ", () => {
  it("đơn OT hiện khung giờ", () => {
    expect(
      khungGio(don({ loaiDon: "lam_them_gio", gioTu: "18:00", gioDen: "21:00" }))
    ).toBe("18:00–21:00");
  });

  it("đơn giải trình CŨNG hiện khung giờ (loại đơn này có trường giờ)", () => {
    expect(
      khungGio(don({ loaiDon: "giai_trinh", gioTu: "08:00", gioDen: "09:00" }))
    ).toBe("08:00–09:00");
  });

  it("đơn nghỉ không có khái niệm khung giờ, kể cả khi bản ghi cũ còn sót giờ", () => {
    expect(
      khungGio(don({ loaiDon: "nghi_phep", gioTu: "18:00", gioDen: "21:00" }))
    ).toBe("-");
  });

  it("thiếu một đầu thì hiện dấu hỏi ở đầu đó, không giấu cả khung giờ", () => {
    expect(khungGio(don({ loaiDon: "lam_them_gio", gioTu: "18:00" }))).toBe(
      "18:00–?"
    );
  });

  it("không có giờ nào thì '-'", () => {
    expect(khungGio(don({ loaiDon: "lam_them_gio" }))).toBe("-");
  });
});

describe("soLieuDon — cột số liệu HR nhìn TRƯỚC KHI duyệt", () => {
  it("đơn nghỉ: hiện số ngày nghỉ backend tính", () => {
    expect(
      soLieuDon(don({ loaiDon: "nghi_phep", soNgayNghi: 3 }))
    ).toBe("3 ngày nghỉ");
  });

  it("nghỉ nửa buổi: 0.5 ngày, không làm tròn", () => {
    expect(
      soLieuDon(don({ loaiDon: "nghi_phep", buoi: "sang", soNgayNghi: 0.5 }))
    ).toBe("0.5 ngày nghỉ");
  });

  it("nghỉ trọn khoảng rơi hết vào ngày lễ: 0 ngày nghỉ, KHÔNG phải '-'", () => {
    // 0 là kết quả THẬT của tinhSoNgayNghi (khoảng nghỉ rơi hết vào ngày lễ /
    // ngày không làm việc). HR phải thấy đúng số 0 để biết đơn này không trừ
    // phép, thay vì thấy ô trống rồi tưởng hệ thống chưa tính.
    expect(soLieuDon(don({ loaiDon: "nghi_bu", soNgayNghi: 0 }))).toBe(
      "0 ngày nghỉ"
    );
  });

  it("đơn OT: hiện số giờ nhân hệ số", () => {
    expect(
      soLieuDon(don({ loaiDon: "lam_them_gio", soGioOt: 3, heSoOt: 1.5 }))
    ).toBe("3 giờ × 1.5");
  });

  it("đơn OT 0 giờ (khai giờ từ = giờ đến) vẫn hiện 0, KHÔNG phải '-'", () => {
    expect(
      soLieuDon(don({ loaiDon: "lam_them_gio", soGioOt: 0, heSoOt: 1.5 }))
    ).toBe("0 giờ × 1.5");
  });

  it("đơn OT hệ số 0 vẫn hiện hệ số 0", () => {
    expect(
      soLieuDon(don({ loaiDon: "lam_them_gio", soGioOt: 2, heSoOt: 0 }))
    ).toBe("2 giờ × 0");
  });

  it("đơn cũ (trước P3.6, chưa có snapshot) → '-' chứ không phải 'undefined'", () => {
    expect(soLieuDon(don({ loaiDon: "lam_them_gio" }))).toBe("-");
    expect(soLieuDon(don({ loaiDon: "nghi_phep" }))).toBe("-");
  });

  it("đơn giải trình không có số liệu nào để hiện", () => {
    expect(soLieuDon(don({ loaiDon: "giai_trinh" }))).toBe("-");
  });
});
