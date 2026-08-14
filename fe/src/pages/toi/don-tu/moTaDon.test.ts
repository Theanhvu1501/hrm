import { describe, it, expect } from "vitest";
import { AttendanceRequest } from "@/services/attendanceRequestService";
import { dongPhu, khoangNgay, ngayVN } from "./moTaDon";

function don(over: Partial<AttendanceRequest> = {}): AttendanceRequest {
  return {
    id: "d1",
    employeeId: "e1",
    loaiDon: "giai_trinh",
    ngay: "2026-07-24",
    trangThai: "cho_duyet",
    isActive: true,
    ...over,
  };
}

describe("ngayVN", () => {
  it("đổi YYYY-MM-DD sang DD/MM/YYYY", () => {
    expect(ngayVN("2026-07-24")).toBe("24/07/2026");
  });

  it("chuỗi rỗng → rỗng, không bịa ra ngày", () => {
    expect(ngayVN("")).toBe("");
    expect(ngayVN(undefined)).toBe("");
  });
});

describe("khoangNgay", () => {
  it("không có denNgay → một ngày", () => {
    expect(khoangNgay(don())).toBe("24/07/2026");
  });

  it("denNgay trùng ngay → vẫn là một ngày, KHÔNG hiện thành khoảng", () => {
    expect(khoangNgay(don({ denNgay: "2026-07-24" }))).toBe("24/07/2026");
  });

  it("khoảng nhiều ngày → hai đầu", () => {
    expect(khoangNgay(don({ denNgay: "2026-07-26" }))).toBe(
      "24/07/2026 – 26/07/2026"
    );
  });
});

describe("dongPhu — số backend tự tính", () => {
  it("đơn OT hiện giờ, số giờ và hệ số", () => {
    const s = dongPhu(
      don({
        loaiDon: "lam_them_gio",
        gioTu: "18:00",
        gioDen: "21:00",
        soGioOt: 3,
        heSoOt: 1.5,
      })
    );
    expect(s).toBe("18:00 – 21:00 · 3 giờ OT · hệ số 1.5");
  });

  it("soGioOt = 0 vẫn phải hiện (0 là con số thật, không phải thiếu dữ liệu)", () => {
    const s = dongPhu(
      don({ loaiDon: "lam_them_gio", gioTu: "18:00", gioDen: "18:00", soGioOt: 0 })
    );
    expect(s).toContain("0 giờ OT");
  });

  it("soNgayNghi = 0 vẫn phải hiện (đơn rơi trọn vào ngày lễ)", () => {
    const s = dongPhu(
      don({ loaiDon: "nghi_phep", loaiNghi: "phep_nam", soNgayNghi: 0 })
    );
    expect(s).toContain("0 ngày nghỉ");
  });

  it("đơn nghỉ nửa buổi hiện buổi + loại nghỉ + số ngày", () => {
    const s = dongPhu(
      don({
        loaiDon: "nghi_phep",
        buoi: "chieu",
        loaiNghi: "om_dau",
        soNgayNghi: 0.5,
      })
    );
    expect(s).toBe("Buổi chiều · Ốm đau · 0.5 ngày nghỉ");
  });

  it("buổi cả ngày là mặc định → không làm rối dòng phụ", () => {
    const s = dongPhu(
      don({ loaiDon: "nghi_bu", buoi: "ca_ngay", soNgayNghi: 1 })
    );
    expect(s).toBe("1 ngày nghỉ");
  });

  it("đơn giải trình chưa có gì để tính → dòng phụ rỗng, không ra ' · '", () => {
    expect(dongPhu(don({ loaiDon: "giai_trinh" }))).toBe("");
  });
});

describe("dongPhu — đơn làm online", () => {
  it("đơn nửa buổi hiện tên buổi", () => {
    expect(
      dongPhu(don({ loaiDon: "lam_online", ngay: "2026-08-10", denNgay: "2026-08-10", buoi: "sang" })),
    ).toBe("Buổi sáng");
  });

  it("đơn trọn ngày không hiện gì thừa", () => {
    expect(
      dongPhu(don({ loaiDon: "lam_online", ngay: "2026-08-10", denNgay: "2026-08-12", buoi: "ca_ngay" })),
    ).toBe("");
  });

  // Đơn online không có giờ OT, không có số ngày nghỉ — rơi vào nhánh OT sẽ
  // hiện "0 giờ OT" trên một cái đơn không liên quan gì tới làm thêm.
  it("không hiện giờ OT", () => {
    expect(dongPhu(don({ loaiDon: "lam_online", soGioOt: 0 } as any))).not.toContain("OT");
  });
});
