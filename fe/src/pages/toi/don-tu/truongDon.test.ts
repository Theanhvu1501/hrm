import { describe, it, expect } from "vitest";
import {
  GIA_TRI_MAC_DINH,
  GiaTriFormDon,
  dungDtoNopDon,
  hienBuoi,
  hienTruong,
  kiemTraDon,
} from "./truongDon";

function form(over: Partial<GiaTriFormDon> = {}): GiaTriFormDon {
  return { ...GIA_TRI_MAC_DINH, ...over };
}

describe("hienTruong — bảng §7 của spec P3.6", () => {
  const BANG: Array<[GiaTriFormDon["loaiDon"], string[]]> = [
    ["giai_trinh", ["ngay", "gioTu", "gioDen", "lyDo"]],
    ["lam_them_gio", ["ngay", "gioTu", "gioDen", "lyDo"]],
    ["nghi_phep", ["ngay", "denNgay", "buoi", "loaiNghi", "lyDo"]],
    ["nghi_bu", ["ngay", "denNgay", "buoi", "lyDo"]],
  ];

  const MOI_TRUONG = [
    "ngay",
    "denNgay",
    "buoi",
    "loaiNghi",
    "lyDo",
    "gioTu",
    "gioDen",
  ] as const;

  it.each(BANG)("%s hiện đúng bộ trường của nó", (loaiDon, mongDoi) => {
    // ngay = denNgay để `buoi` được phép hiện với đơn nghỉ.
    const v = form({ loaiDon, ngay: "2026-07-24", denNgay: "2026-07-24" });
    const thucTe = MOI_TRUONG.filter((t) => hienTruong(v, t));
    expect([...thucTe].sort()).toEqual([...mongDoi].sort());
  });

  it("giai_trinh KHÔNG hiện denNgay/buoi/loaiNghi dù người dùng vừa đổi từ đơn nghỉ sang", () => {
    const v = form({
      loaiDon: "giai_trinh",
      ngay: "2026-07-24",
      denNgay: "2026-07-26",
      loaiNghi: "phep_nam",
    });
    expect(hienTruong(v, "denNgay")).toBe(false);
    expect(hienTruong(v, "buoi")).toBe(false);
    expect(hienTruong(v, "loaiNghi")).toBe(false);
  });
});

describe("hienBuoi — nửa buổi chỉ có nghĩa với đơn nghỉ đúng một ngày", () => {
  it("nghỉ phép đúng một ngày → có buổi", () => {
    expect(
      hienBuoi(form({ loaiDon: "nghi_phep", ngay: "2026-07-24", denNgay: "2026-07-24" }))
    ).toBe(true);
  });

  it("nghỉ phép chưa chọn đến ngày → vẫn coi là một ngày", () => {
    expect(
      hienBuoi(form({ loaiDon: "nghi_phep", ngay: "2026-07-24", denNgay: "" }))
    ).toBe(true);
  });

  it("nghỉ phép nhiều ngày → KHÔNG có buổi", () => {
    expect(
      hienBuoi(form({ loaiDon: "nghi_phep", ngay: "2026-07-24", denNgay: "2026-07-26" }))
    ).toBe(false);
  });

  it("làm thêm giờ không bao giờ có buổi", () => {
    expect(
      hienBuoi(form({ loaiDon: "lam_them_gio", ngay: "2026-07-24", denNgay: "2026-07-24" }))
    ).toBe(false);
  });
});

describe("dungDtoNopDon — payload phải khớp TaoDonCuaToiDto, không thừa một khoá", () => {
  /**
   * Khoá bị cấm tuyệt đối: backend `TaoDonCuaToiDto` là OmitType bỏ ba trường
   * này, và pipe `forbidNonWhitelisted` sẽ trả 400 cho cả cái đơn nếu thấy.
   */
  const KHOA_CAM = ["employeeId", "trangThai", "nguoiDuyet"];

  const MOI_LOAI: Array<GiaTriFormDon["loaiDon"]> = [
    "giai_trinh",
    "lam_them_gio",
    "nghi_phep",
    "nghi_bu",
  ];

  it.each(MOI_LOAI)("%s không bao giờ gửi employeeId/trangThai/nguoiDuyet", (loaiDon) => {
    const dto = dungDtoNopDon(
      form({
        loaiDon,
        ngay: "2026-07-24",
        denNgay: "2026-07-24",
        loaiNghi: "phep_nam",
        gioTu: "18:00",
        gioDen: "20:00",
        lyDo: "abc",
      })
    );
    for (const khoa of KHOA_CAM) {
      expect(Object.keys(dto)).not.toContain(khoa);
    }
  });

  it("giải trình chỉ gửi loaiDon/ngay/gioTu/gioDen/lyDo", () => {
    const dto = dungDtoNopDon(
      form({
        loaiDon: "giai_trinh",
        ngay: "2026-07-24",
        gioTu: "08:00",
        gioDen: "09:00",
        lyDo: "Quên chấm công",
        // Rác còn sót lại khi người dùng đổi loại đơn qua lại — không được lọt.
        denNgay: "2026-07-30",
        loaiNghi: "om_dau",
      })
    );
    expect(dto).toEqual({
      loaiDon: "giai_trinh",
      ngay: "2026-07-24",
      gioTu: "08:00",
      gioDen: "09:00",
      lyDo: "Quên chấm công",
    });
  });

  it("làm thêm giờ KHÔNG gửi soGioOt/heSoOt — backend tự tính", () => {
    const dto = dungDtoNopDon(
      form({
        loaiDon: "lam_them_gio",
        ngay: "2026-07-24",
        gioTu: "18:00",
        gioDen: "21:00",
        lyDo: "Chạy deadline",
      })
    );
    expect(dto).toEqual({
      loaiDon: "lam_them_gio",
      ngay: "2026-07-24",
      gioTu: "18:00",
      gioDen: "21:00",
      lyDo: "Chạy deadline",
    });
  });

  it("nghỉ phép nhiều ngày: gửi denNgay, KHÔNG gửi buoi", () => {
    const dto = dungDtoNopDon(
      form({
        loaiDon: "nghi_phep",
        ngay: "2026-07-24",
        denNgay: "2026-07-26",
        buoi: "sang",
        loaiNghi: "phep_nam",
        lyDo: "Về quê",
      })
    );
    expect(dto).toEqual({
      loaiDon: "nghi_phep",
      ngay: "2026-07-24",
      denNgay: "2026-07-26",
      loaiNghi: "phep_nam",
      lyDo: "Về quê",
    });
  });

  it("nghỉ phép một ngày nửa buổi: gửi buoi và denNgay = ngay", () => {
    const dto = dungDtoNopDon(
      form({
        loaiDon: "nghi_phep",
        ngay: "2026-07-24",
        denNgay: "",
        buoi: "chieu",
        loaiNghi: "om_dau",
        lyDo: "Khám bệnh",
      })
    );
    expect(dto).toEqual({
      loaiDon: "nghi_phep",
      ngay: "2026-07-24",
      denNgay: "2026-07-24",
      buoi: "chieu",
      loaiNghi: "om_dau",
      lyDo: "Khám bệnh",
    });
  });

  it("nghỉ bù KHÔNG gửi loaiNghi (loại đơn này không có trường đó)", () => {
    const dto = dungDtoNopDon(
      form({
        loaiDon: "nghi_bu",
        ngay: "2026-07-24",
        denNgay: "2026-07-24",
        loaiNghi: "phep_nam",
        lyDo: "Bù ngày trực",
      })
    );
    expect(Object.keys(dto)).not.toContain("loaiNghi");
  });

  it("lý do chỉ có khoảng trắng → bỏ khoá lyDo, không gửi chuỗi rỗng", () => {
    const dto = dungDtoNopDon(
      form({ loaiDon: "giai_trinh", ngay: "2026-07-24", lyDo: "   " })
    );
    expect(Object.keys(dto)).not.toContain("lyDo");
  });
});

describe("kiemTraDon", () => {
  it("thiếu ngày → báo lỗi", () => {
    expect(kiemTraDon(form({ ngay: "", lyDo: "x" }))).toMatch(/Ngày/);
  });

  it("làm thêm giờ thiếu giờ → chặn ở FE (backend dùng dto.gioTu! sẽ nổ)", () => {
    const loi = kiemTraDon(
      form({ loaiDon: "lam_them_gio", ngay: "2026-07-24", gioTu: "18:00", lyDo: "x" })
    );
    expect(loi).toMatch(/giờ bắt đầu và giờ kết thúc/);
  });

  it("nghỉ phép thiếu loại nghỉ → chặn", () => {
    expect(
      kiemTraDon(form({ loaiDon: "nghi_phep", ngay: "2026-07-24", lyDo: "x" }))
    ).toMatch(/loại nghỉ/);
  });

  it("nghỉ bù KHÔNG đòi loại nghỉ", () => {
    expect(
      kiemTraDon(form({ loaiDon: "nghi_bu", ngay: "2026-07-24", lyDo: "x" }))
    ).toBeNull();
  });

  it("đến ngày trước ngày bắt đầu → chặn", () => {
    expect(
      kiemTraDon(
        form({
          loaiDon: "nghi_bu",
          ngay: "2026-07-24",
          denNgay: "2026-07-20",
          lyDo: "x",
        })
      )
    ).toMatch(/Đến ngày/);
  });

  it("giai_trinh mang denNgay rác nhỏ hơn ngay (sót lại từ lúc còn là đơn nghỉ) → KHÔNG chặn", () => {
    // Kịch bản kẹt cứng: chọn Nghỉ phép (ngay=01, denNgay=05) → đổi sang
    // Giải trình (ô "Đến ngày" biến mất nhưng denNgay=05 vẫn còn trong
    // state) → sửa ngay thành 10. giai_trinh không có trường denNgay nên
    // kiemTraDon phải bỏ qua nó, không được đọc thẳng v.denNgay.
    expect(
      kiemTraDon(
        form({
          loaiDon: "giai_trinh",
          ngay: "2026-08-10",
          denNgay: "2026-08-05",
          gioTu: "18:00",
          gioDen: "20:00",
          lyDo: "x",
        })
      )
    ).toBeNull();
  });

  it("thiếu lý do → chặn", () => {
    expect(
      kiemTraDon(form({ loaiDon: "giai_trinh", ngay: "2026-07-24", lyDo: " " }))
    ).toMatch(/lý do/);
  });

  it("đơn hợp lệ → null", () => {
    expect(
      kiemTraDon(
        form({
          loaiDon: "lam_them_gio",
          ngay: "2026-07-24",
          gioTu: "18:00",
          gioDen: "20:00",
          lyDo: "Chạy deadline",
        })
      )
    ).toBeNull();
  });
});
