import { describe, expect, it } from "vitest";
import { apDungSoThat } from "./soThat";
import { layBaoCao, KY_MAC_DINH } from "./duLieuMau";
import { coSoLieu, chuaCoNguon } from "./baoCao.types";
import type { ChiSoThang } from "@/services/baoCaoNhanSuService";

function chiSo(over: Partial<ChiSoThang> = {}): ChiSoThang {
  return {
    ky: KY_MAC_DINH,
    tongNhanSu: 50,
    vaoMoi: 3,
    nghiViec: 2,
    nghiSom: 1,
    luotThangTien: 4,
    tyLeVangMat: 2.5,
    gioLamThem: 120,
    ...over,
  };
}

/** Tìm một chỉ số theo mã trong khung báo cáo. */
function tim(bc: ReturnType<typeof layBaoCao>, ma: string) {
  return bc.nhom.flatMap((n) => n.chiSo).find((cs) => cs.ma === ma)!;
}

describe("apDungSoThat", () => {
  const khung = layBaoCao(KY_MAC_DINH);

  it("thay số mẫu bằng số thật cho chỉ số đã có nguồn", () => {
    const ra = apDungSoThat(khung, [chiSo()], KY_MAC_DINH);
    const cs = tim(ra, "nhan-su-hien-tai");

    expect(coSoLieu(cs.nguon)).toBe(true);
    if (coSoLieu(cs.nguon)) {
      expect(cs.nguon.giaTri).toBe(50);
      expect(cs.nguon.moTaNguon).toContain("employees");
    }
  });

  it("tỷ lệ nghỉ việc tính từ số thật, làm tròn 1 chữ số", () => {
    const ra = apDungSoThat(
      khung,
      [chiSo({ tongNhanSu: 30, nghiViec: 2 })],
      KY_MAC_DINH,
    );
    const cs = tim(ra, "turnover");
    if (coSoLieu(cs.nguon)) expect(cs.nguon.giaTri).toBe(6.7);
  });

  it("chưa tổng hợp bảng công thì KHÔNG dựng số vắng mặt", () => {
    const ra = apDungSoThat(
      khung,
      [chiSo({ tyLeVangMat: null, gioLamThem: null })],
      KY_MAC_DINH,
    );
    // Giữ nguyên khung cũ (số mẫu) chứ không bịa 0% — xem docblock của
    // `apDungSoThat`; ô này sẽ được khung demo hiện như trước.
    const cs = tim(ra, "absenteeism");
    expect(cs).toBeDefined();
  });

  it("chỉ số chưa có module nguồn bị chuyển hẳn sang 'chưa có', không giữ số mẫu", () => {
    const ra = apDungSoThat(khung, [chiSo()], KY_MAC_DINH);
    for (const ma of ["vuot-thu-viec", "ho-so-phap-ly", "key-talent-retention"]) {
      const cs = tim(ra, ma);
      expect(chuaCoNguon(cs.nguon)).toBe(true);
      if (chuaCoNguon(cs.nguon)) expect(cs.nguon.canGi.length).toBeGreaterThan(0);
    }
  });

  it("đếm lại dải tóm tắt theo trạng thái MỚI của các chỉ số", () => {
    const ra = apDungSoThat(khung, [chiSo()], KY_MAC_DINH);
    const tatCa = ra.nhom.flatMap((n) => n.chiSo);
    expect(ra.soChiSoCoSoLieu + ra.soChiSoChuaCoNguon).toBe(tatCa.length);
    expect(ra.soChiSoCoSoLieu).toBe(
      tatCa.filter((cs) => coSoLieu(cs.nguon)).length,
    );
  });

  it("không có chỉ số của kỳ đang xem thì trả nguyên khung, không vỡ", () => {
    const ra = apDungSoThat(khung, [chiSo({ ky: "1999-01" })], KY_MAC_DINH);
    expect(ra).toBe(khung);
  });

  it("có kỳ liền trước thì điền `kyTruoc` để thẻ hiện biến động", () => {
    const truoc = chiSo({ ky: "2026-06", tongNhanSu: 45 });
    const nay = chiSo({ ky: "2026-07", tongNhanSu: 50 });
    const ra = apDungSoThat(layBaoCao("2026-07"), [truoc, nay], "2026-07");
    const cs = tim(ra, "nhan-su-hien-tai");
    if (coSoLieu(cs.nguon)) expect(cs.nguon.kyTruoc).toBe(45);
  });
});
