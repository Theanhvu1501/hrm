import { describe, it, expect } from "vitest";
import { AttendanceRequest } from "@/services/attendanceRequestService";
import {
  GIA_TRI_MAC_DINH,
  dungDtoQuanTri,
  toFormValues,
} from "./donChamCongForm.convert";
import { DonChamCongFormValues } from "./DonChamCongForm.state";

function form(over: Partial<DonChamCongFormValues> = {}): DonChamCongFormValues {
  return { ...GIA_TRI_MAC_DINH, employeeId: "nv1", ngay: "2026-07-24", ...over };
}

/**
 * Khoá backend TỪ CHỐI hoặc BỎ QUA — gửi lên là hỏng đơn hoặc gây hiểu nhầm:
 *
 *  - soNgayNghi/soGioOt/heSoOt/loaiNgayOt: KHÔNG có trong CreateDonChamCongDto,
 *    mà pipe bật `forbidNonWhitelisted` → 400 cho cả cái đơn.
 *  - trangThai/nguoiDuyet: có trong DTO nhưng `create()` luôn tạo ở cho_duyet
 *    và `update()` bóc bỏ cả hai. Gửi lên thì HR tưởng mình vừa duyệt xong.
 */
const KHOA_KHONG_DUOC_GUI = [
  "soNgayNghi",
  "soGioOt",
  "heSoOt",
  "loaiNgayOt",
  "trangThai",
  "nguoiDuyet",
];

describe("dungDtoQuanTri — payload phải khớp CreateDonChamCongDto", () => {
  const MOI_LOAI: Array<DonChamCongFormValues["loaiDon"]> = [
    "giai_trinh",
    "lam_them_gio",
    "nghi_phep",
    "nghi_bu",
  ];

  it.each(MOI_LOAI)("%s: luôn có employeeId, không bao giờ có khoá cấm", (loaiDon) => {
    const dto = dungDtoQuanTri(
      form({
        loaiDon,
        denNgay: "2026-07-24",
        loaiNghi: "phep_nam",
        gioTu: "18:00",
        gioDen: "20:00",
        lyDo: "x",
      })
    );
    expect(dto.employeeId).toBe("nv1");
    for (const khoa of KHOA_KHONG_DUOC_GUI) {
      expect(Object.keys(dto)).not.toContain(khoa);
    }
  });

  it("nghỉ phép nhiều ngày: có denNgay/loaiNghi, KHÔNG có gioTu/gioDen/buoi", () => {
    const dto = dungDtoQuanTri(
      form({
        loaiDon: "nghi_phep",
        ngay: "2026-08-03",
        denNgay: "2026-08-05",
        buoi: "sang",
        loaiNghi: "phep_nam",
        lyDo: "Về quê",
        // Rác sót lại từ lúc form còn là đơn OT — HR đổi loại đơn qua lại.
        gioTu: "18:00",
        gioDen: "20:00",
      })
    );
    // toStrictEqual chứ không toEqual: toEqual coi { a: 1, b: undefined } bằng
    // { a: 1 }, nên một khoá `gioTu: undefined` lọt vào payload vẫn xanh —
    // trong khi backend forbidNonWhitelisted lại thấy khoá đó và 400.
    expect(dto).toStrictEqual({
      employeeId: "nv1",
      loaiDon: "nghi_phep",
      ngay: "2026-08-03",
      denNgay: "2026-08-05",
      loaiNghi: "phep_nam",
      lyDo: "Về quê",
    });
  });

  it("nghỉ phép một ngày: gửi buoi và denNgay = ngay (HR chưa chọn đến ngày)", () => {
    const dto = dungDtoQuanTri(
      form({
        loaiDon: "nghi_phep",
        ngay: "2026-08-03",
        denNgay: "",
        buoi: "chieu",
        loaiNghi: "om_dau",
        lyDo: "Khám bệnh",
      })
    );
    expect(dto).toStrictEqual({
      employeeId: "nv1",
      loaiDon: "nghi_phep",
      ngay: "2026-08-03",
      denNgay: "2026-08-03",
      buoi: "chieu",
      loaiNghi: "om_dau",
      lyDo: "Khám bệnh",
    });
  });

  it("nghỉ bù KHÔNG gửi loaiNghi (loại đơn này không có trường đó)", () => {
    const dto = dungDtoQuanTri(
      form({
        loaiDon: "nghi_bu",
        ngay: "2026-08-03",
        denNgay: "2026-08-03",
        loaiNghi: "phep_nam",
        lyDo: "Bù ngày trực",
      })
    );
    expect(Object.keys(dto)).not.toContain("loaiNghi");
  });

  it("giải trình KHÔNG gửi denNgay/buoi/loaiNghi dù state còn giá trị cũ", () => {
    const dto = dungDtoQuanTri(
      form({
        loaiDon: "giai_trinh",
        ngay: "2026-07-20",
        denNgay: "2026-07-30",
        buoi: "sang",
        loaiNghi: "om_dau",
        gioTu: "08:00",
        gioDen: "09:00",
        lyDo: "Quên chấm công",
      })
    );
    expect(dto).toStrictEqual({
      employeeId: "nv1",
      loaiDon: "giai_trinh",
      ngay: "2026-07-20",
      gioTu: "08:00",
      gioDen: "09:00",
      lyDo: "Quên chấm công",
    });
  });

  it("làm thêm giờ giữ gioTu/gioDen, không tự khai soGioOt/heSoOt", () => {
    const dto = dungDtoQuanTri(
      form({
        loaiDon: "lam_them_gio",
        ngay: "2026-07-24",
        gioTu: "18:00",
        gioDen: "21:00",
        lyDo: "Chạy deadline",
      })
    );
    expect(dto).toStrictEqual({
      employeeId: "nv1",
      loaiDon: "lam_them_gio",
      ngay: "2026-07-24",
      gioTu: "18:00",
      gioDen: "21:00",
      lyDo: "Chạy deadline",
    });
  });

  it("ô trống (lý do/minh chứng/ghi chú) thì bỏ hẳn khoá, không gửi chuỗi rỗng", () => {
    const dto = dungDtoQuanTri(
      form({ loaiDon: "giai_trinh", lyDo: "   ", minhChung: "", ghiChu: "  " })
    );
    expect(Object.keys(dto)).not.toContain("lyDo");
    expect(Object.keys(dto)).not.toContain("minhChung");
    expect(Object.keys(dto)).not.toContain("ghiChu");
  });

  it("minh chứng và ghi chú đi kèm mọi loại đơn", () => {
    const dto = dungDtoQuanTri(
      form({
        loaiDon: "nghi_phep",
        loaiNghi: "thai_san",
        denNgay: "2026-09-24",
        minhChung: "https://drive/abc",
        ghiChu: "HR nộp hộ",
      })
    );
    expect(dto.minhChung).toBe("https://drive/abc");
    expect(dto.ghiChu).toBe("HR nộp hộ");
  });
});

describe("toFormValues — mở form sửa một đơn đã có", () => {
  function don(over: Partial<AttendanceRequest> = {}): AttendanceRequest {
    return {
      id: "d1",
      employeeId: "nv1",
      loaiDon: "giai_trinh",
      ngay: "2026-07-24",
      trangThai: "cho_duyet",
      isActive: true,
      ...over,
    };
  }

  it("nạp lại đủ trường của đơn nghỉ phép, không mất denNgay/buoi/loaiNghi", () => {
    const v = toFormValues(
      don({
        loaiDon: "nghi_phep",
        ngay: "2026-08-03",
        denNgay: "2026-08-03",
        buoi: "sang",
        loaiNghi: "om_dau",
      })
    );
    expect(v.denNgay).toBe("2026-08-03");
    expect(v.buoi).toBe("sang");
    expect(v.loaiNghi).toBe("om_dau");
  });

  it("đơn không phải đơn nghỉ → buoi về mặc định ca_ngay, loaiNghi rỗng", () => {
    const v = toFormValues(don({ loaiDon: "lam_them_gio", gioTu: "18:00" }));
    expect(v.buoi).toBe("ca_ngay");
    expect(v.loaiNghi).toBe("");
    expect(v.gioTu).toBe("18:00");
  });

  it("mở form tạo mới (không có đơn) → giá trị mặc định", () => {
    expect(toFormValues(null)).toStrictEqual(GIA_TRI_MAC_DINH);
  });

  it("sửa rồi gửi lại đơn nghỉ phép vẫn ra payload đơn nghỉ (round-trip)", () => {
    const dto = dungDtoQuanTri(
      toFormValues(
        don({
          loaiDon: "nghi_bu",
          ngay: "2026-08-03",
          denNgay: "2026-08-05",
          lyDo: "Bù ngày trực",
        })
      )
    );
    expect(dto).toStrictEqual({
      employeeId: "nv1",
      loaiDon: "nghi_bu",
      ngay: "2026-08-03",
      denNgay: "2026-08-05",
      lyDo: "Bù ngày trực",
      // P4.2a: đơn nghi_bu cũ (trước khi có kieuNghi) nạp lại vào form mặc
      // định "theo_ngay" (toFormValues) rồi gửi tường minh trở lại
      // (dungDtoQuanTri) — không còn là trường "im lặng" ở round-trip nữa.
      kieuNghi: "theo_ngay",
    });
  });
});
