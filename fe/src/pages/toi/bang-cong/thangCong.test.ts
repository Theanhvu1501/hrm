import { describe, expect, it } from "vitest";
import { dichThang, luoiThang, tinhONgay } from "./thangCong";
import { AttendanceRecord } from "@/services/attendanceRecordService";
import { AttendanceRequest } from "@/services/attendanceRequestService";

/** Bản ghi tối giản đủ field mà tinhONgay/suySoCong cần đọc. */
function banGhi(ngay: string, loai: "vao" | "ra"): AttendanceRecord {
  return {
    id: `${ngay}-${loai}`,
    employeeId: "nv1",
    ngay,
    loai,
    thoiDiem: `${ngay}T00:00:00.000Z`,
    ngoaiVung: false,
    soPhutDiMuon: 0,
    soPhutVeSom: 0,
    laNgayNghi: false,
    nguonTao: "tu_cham",
  };
}

/** Đơn từ tối giản đủ field mà tinhONgay cần đọc. */
function don(overrides: Partial<AttendanceRequest>): AttendanceRequest {
  return {
    id: "d1",
    employeeId: "nv1",
    loaiDon: "nghi_phep",
    ngay: "2026-07-06",
    trangThai: "da_duyet",
    isActive: true,
    ...overrides,
  };
}

describe("luoiThang", () => {
  it("tháng bắt đầu giữa tuần (07/2026, thứ Tư, 31 ngày) — đệm đầu/cuối đúng, tuần bắt đầu Thứ Hai", () => {
    const luoi = luoiThang("2026-07");

    // Tuần đầu: Thứ Hai 29/06 .. Chủ Nhật 05/07 — 2 ô đệm rồi tới 01/07.
    expect(luoi[0]).toEqual([
      "",
      "",
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ]);

    // Tuần cuối: Thứ Hai 27/07 .. Chủ Nhật 02/08 — 2 ô đệm cuối.
    const tuanCuoi = luoi[luoi.length - 1];
    expect(tuanCuoi).toEqual([
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "",
      "",
    ]);

    expect(luoi).toHaveLength(5);

    const tongNgayThuc = luoi.flat().filter(Boolean).length;
    expect(tongNgayThuc).toBe(31);
  });

  it("tháng bắt đầu Chủ Nhật (02/2026, 28 ngày) — tuần đầu gần như toàn đệm", () => {
    const luoi = luoiThang("2026-02");

    expect(luoi[0]).toEqual([
      "",
      "",
      "",
      "",
      "",
      "",
      "2026-02-01",
    ]);

    const tuanCuoi = luoi[luoi.length - 1];
    expect(tuanCuoi[0]).toBe("2026-02-23");
    expect(tuanCuoi[5]).toBe("2026-02-28");
    expect(tuanCuoi[6]).toBe("");

    const tongNgayThuc = luoi.flat().filter(Boolean).length;
    expect(tongNgayThuc).toBe(28);
  });

  it("tháng 30 ngày, bắt đầu Thứ Bảy (04/2023) — tuần cuối lấp kín không đệm", () => {
    const luoi = luoiThang("2023-04");

    expect(luoi[0]).toEqual([
      "",
      "",
      "",
      "",
      "",
      "2023-04-01",
      "2023-04-02",
    ]);

    const tuanCuoi = luoi[luoi.length - 1];
    expect(tuanCuoi).toEqual([
      "2023-04-24",
      "2023-04-25",
      "2023-04-26",
      "2023-04-27",
      "2023-04-28",
      "2023-04-29",
      "2023-04-30",
    ]);

    const tongNgayThuc = luoi.flat().filter(Boolean).length;
    expect(tongNgayThuc).toBe(30);
  });
});

describe("dichThang", () => {
  it("lùi/tiến trong cùng năm", () => {
    expect(dichThang("2026-07", -1)).toBe("2026-06");
    expect(dichThang("2026-07", 1)).toBe("2026-08");
  });

  it("vượt biên năm cả hai chiều", () => {
    expect(dichThang("2026-01", -1)).toBe("2025-12");
    expect(dichThang("2026-12", 1)).toBe("2027-01");
  });
});

describe("tinhONgay — công từ bản ghi (không có đơn)", () => {
  const homNay = "2026-07-10"; // mốc "hôm nay" cho các test ngày đã qua/tương lai

  it("có vào + ra → công = 1", () => {
    const ngay = "2026-07-06"; // Thứ Hai, không cuối tuần
    const o = tinhONgay(
      ngay,
      [banGhi(ngay, "vao"), banGhi(ngay, "ra")],
      [],
      homNay,
      null
    );
    expect(o.cong).toBe(1);
    expect(o.kyHieu).toBeUndefined();
    expect(o.hienThi).toBe("1");
    expect(o.trongThang).toBe(true);
    expect(o.laCuoiTuan).toBe(false);
  });

  it("chỉ có vào (đang trong ca) → công = null, hiển thị đang chờ", () => {
    const ngay = "2026-07-06";
    const o = tinhONgay(ngay, [banGhi(ngay, "vao")], [], homNay, null);
    expect(o.cong).toBeNull();
    expect(o.hienThi).toBe("•");
  });

  it("không có bản ghi, ngày thường, đã qua → công = 0, hiển thị 0", () => {
    const ngay = "2026-07-06";
    const o = tinhONgay(ngay, [], [], homNay, null);
    expect(o.cong).toBe(0);
    expect(o.hienThi).toBe("0");
  });

  it("cuối tuần không làm (Thứ Bảy) → hiển thị 'N', không tính công", () => {
    const ngay = "2026-07-04"; // Thứ Bảy
    const o = tinhONgay(ngay, [], [], homNay, null);
    expect(o.laCuoiTuan).toBe(true);
    expect(o.cong).toBe(0);
    expect(o.hienThi).toBe("N");
  });

  it("ngày tương lai không có dữ liệu → để trống, không phải 'N' hay '0'", () => {
    const ngay = "2026-07-15"; // sau homNay=07-10
    const o = tinhONgay(ngay, [], [], homNay, null);
    expect(o.hienThi).toBe("");
  });

  it("ngày tương lai rơi vào cuối tuần cũng để trống, không phải 'N'", () => {
    const ngay = "2026-07-11"; // Thứ Bảy, sau homNay=07-10
    const o = tinhONgay(ngay, [], [], homNay, null);
    expect(o.laCuoiTuan).toBe(true);
    expect(o.hienThi).toBe("");
  });

  it("ô HÔM NAY lấy công từ congHomNay, không suy từ bản ghi dải tháng", () => {
    const ngay = homNay;
    // banGhiNgay cố tình để trống/cũ — congHomNay phải thắng.
    const o = tinhONgay(ngay, [], [], homNay, 1);
    expect(o.cong).toBe(1);
    expect(o.hienThi).toBe("1");
  });

  it("ô HÔM NAY với congHomNay = null (đang trong ca) → hiển thị đang chờ", () => {
    const o = tinhONgay(homNay, [banGhi(homNay, "vao"), banGhi(homNay, "ra")], [], homNay, null);
    expect(o.cong).toBeNull();
    expect(o.hienThi).toBe("•");
  });
});

describe("tinhONgay — đơn nghỉ phép/nghỉ bù đã duyệt", () => {
  const homNay = "2026-07-10";

  it("nghỉ phép cả ngày (buoi ca_ngay) đã duyệt → công = 1, ký hiệu P", () => {
    const ngay = "2026-07-06";
    const o = tinhONgay(
      ngay,
      [],
      [don({ loaiDon: "nghi_phep", ngay, buoi: "ca_ngay", trangThai: "da_duyet" })],
      homNay,
      null
    );
    expect(o.cong).toBe(1);
    expect(o.kyHieu).toBe("P");
    expect(o.hienThi).toBe("1");
  });

  it("nghỉ bù nửa ngày (buoi sang) đã duyệt → công = 0.5, ký hiệu B", () => {
    const ngay = "2026-07-06";
    const o = tinhONgay(
      ngay,
      [],
      [don({ loaiDon: "nghi_bu", ngay, buoi: "sang", trangThai: "da_duyet" })],
      homNay,
      null
    );
    expect(o.cong).toBe(0.5);
    expect(o.kyHieu).toBe("B");
    expect(o.hienThi).toBe("0.5");
  });

  it("nghỉ phép nhiều ngày (không có buoi) phủ một ngày giữa khoảng → công = 1, ký hiệu P", () => {
    const ngay = "2026-07-08"; // giữa 07-07..07-09
    const o = tinhONgay(
      ngay,
      [],
      [
        don({
          loaiDon: "nghi_phep",
          ngay: "2026-07-07",
          denNgay: "2026-07-09",
          trangThai: "da_duyet",
        }),
      ],
      homNay,
      null
    );
    expect(o.cong).toBe(1);
    expect(o.kyHieu).toBe("P");
  });

  it("đơn CHƯA duyệt (cho_duyet) bị bỏ qua — vẫn tính theo bản ghi", () => {
    const ngay = "2026-07-06";
    const o = tinhONgay(
      ngay,
      [],
      [don({ loaiDon: "nghi_phep", ngay, buoi: "ca_ngay", trangThai: "cho_duyet" })],
      homNay,
      null
    );
    expect(o.kyHieu).toBeUndefined();
    expect(o.cong).toBe(0);
    expect(o.hienThi).toBe("0");
  });

  it("đơn bị từ chối (tu_choi) bị bỏ qua", () => {
    const ngay = "2026-07-06";
    const o = tinhONgay(
      ngay,
      [],
      [don({ loaiDon: "nghi_phep", ngay, buoi: "ca_ngay", trangThai: "tu_choi" })],
      homNay,
      null
    );
    expect(o.kyHieu).toBeUndefined();
  });

  it("đơn giải trình/làm thêm giờ đã duyệt KHÔNG tạo ký hiệu nghỉ", () => {
    const ngay = "2026-07-06";
    const oGiaiTrinh = tinhONgay(
      ngay,
      [banGhi(ngay, "vao"), banGhi(ngay, "ra")],
      [don({ loaiDon: "giai_trinh", ngay, trangThai: "da_duyet" })],
      homNay,
      null
    );
    expect(oGiaiTrinh.kyHieu).toBeUndefined();
    expect(oGiaiTrinh.cong).toBe(1);

    const oOt = tinhONgay(
      ngay,
      [],
      [don({ loaiDon: "lam_them_gio", ngay, trangThai: "da_duyet" })],
      homNay,
      null
    );
    expect(oOt.kyHieu).toBeUndefined();
    expect(oOt.cong).toBe(0);
  });
});

/**
 * Ngày làm online phải nhìn ra được ngay trên lịch của nhân viên — nếu không
 * thì ô đó trông y hệt một ngày lên văn phòng, trong khi nó không có tiền ăn.
 *
 * Luật giống hệt backend `suy-ky-hieu.ts`: đơn online KHÔNG tự phát công,
 * phải có chấm công thì mới là một ngày công online.
 */
describe("tinhONgay — ngày làm online", () => {
  const donOnline = (over: Partial<AttendanceRequest> = {}) =>
    don({
      loaiDon: "lam_online",
      ngay: "2026-07-06",
      denNgay: "2026-07-08",
      ...over,
    });

  it("có đơn online + chấm đủ vào/ra → ký hiệu OL, 1 công", () => {
    const o = tinhONgay(
      "2026-07-07",
      [banGhi("2026-07-07", "vao"), banGhi("2026-07-07", "ra")],
      [donOnline()],
      "2026-07-20",
      null,
    );

    expect(o.kyHieu).toBe("OL");
    expect(o.cong).toBe(1);
    expect(o.hienThi).toBe("1");
  });

  it("có đơn online nhưng KHÔNG chấm công → không gắn OL", () => {
    const o = tinhONgay("2026-07-07", [], [donOnline()], "2026-07-20", null);

    expect(o.kyHieu).toBeUndefined();
    expect(o.cong).toBe(0);
  });

  it("đơn online chưa duyệt → không gắn OL", () => {
    const o = tinhONgay(
      "2026-07-07",
      [banGhi("2026-07-07", "vao"), banGhi("2026-07-07", "ra")],
      [donOnline({ trangThai: "cho_duyet" })],
      "2026-07-20",
      null,
    );

    expect(o.kyHieu).toBeUndefined();
  });

  it("ngày ngoài khoảng của đơn → không gắn OL", () => {
    const o = tinhONgay(
      "2026-07-09",
      [banGhi("2026-07-09", "vao"), banGhi("2026-07-09", "ra")],
      [donOnline()],
      "2026-07-20",
      null,
    );

    expect(o.kyHieu).toBeUndefined();
  });

  // Đơn nghỉ thắng đơn online — cùng thứ tự ưu tiên với backend.
  it("trùng ngày với đơn nghỉ phép → P thắng", () => {
    const o = tinhONgay(
      "2026-07-07",
      [banGhi("2026-07-07", "vao"), banGhi("2026-07-07", "ra")],
      [donOnline(), don({ ngay: "2026-07-07", denNgay: "2026-07-07" })],
      "2026-07-20",
      null,
    );

    expect(o.kyHieu).toBe("P");
  });
});
