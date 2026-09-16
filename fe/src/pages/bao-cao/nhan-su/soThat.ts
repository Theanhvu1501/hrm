import type { BaoCaoNhanSu } from "./duLieuMau";
import { coSoLieu } from "./baoCao.types";
import type { ChiSoThang } from "@/services/baoCaoNhanSuService";

/**
 * Thay SỐ MẪU bằng SỐ THẬT cho những chỉ số đã có module nguồn (yêu cầu d47:
 * "Liên kết dữ liệu sang khi đủ các phần hành").
 *
 * Nguyên tắc giữ nguyên từ bản demo: chỉ số nào CHƯA có nguồn thì chuyển hẳn
 * sang `{ co: false, canGi }` — KHÔNG để lại số mẫu trông như số thật. Một
 * dashboard có vài ô là số thật và vài ô là số bịa, nhìn giống hệt nhau, là
 * thứ nguy hiểm nhất có thể mang vào phòng họp.
 *
 * Hàm THUẦN: nhận khung báo cáo + chuỗi chỉ số từ BE, trả khung mới.
 */
export function apDungSoThat(
  baoCao: BaoCaoNhanSu,
  chuoi: ChiSoThang[],
  ky: string,
): BaoCaoNhanSu {
  const nay = chuoi.find((c) => c.ky === ky);
  const viTri = chuoi.findIndex((c) => c.ky === ky);
  const truoc = viTri > 0 ? chuoi[viTri - 1] : undefined;
  if (!nay) return baoCao;

  const tyLe = (tu: number, mau: number): number =>
    mau > 0 ? Math.round((tu / mau) * 1000) / 10 : 0;

  /** Giá trị thật theo mã chỉ số; `undefined` = giữ nguyên khung cũ. */
  const soThat: Record<
    string,
    { giaTri: number; kyTruoc?: number; moTaNguon: string } | undefined
  > = {
    "nhan-su-hien-tai": {
      giaTri: nay.tongNhanSu,
      kyTruoc: truoc?.tongNhanSu,
      moTaNguon: "employees (ngày vào làm / ngày nghỉ việc)",
    },
    "nhan-su-ky-truoc": truoc && {
      giaTri: truoc.tongNhanSu,
      moTaNguon: "employees (kỳ liền trước)",
    },
    turnover: {
      giaTri: tyLe(nay.nghiViec, nay.tongNhanSu),
      kyTruoc: truoc ? tyLe(truoc.nghiViec, truoc.tongNhanSu) : undefined,
      moTaNguon: "employees + resignations",
    },
    "early-turnover": {
      giaTri: tyLe(nay.nghiSom, nay.nghiViec),
      kyTruoc: truoc ? tyLe(truoc.nghiSom, truoc.nghiViec) : undefined,
      moTaNguon: "resignations (nghỉ trước 6 tháng làm việc)",
    },
    "internal-mobility": {
      giaTri: nay.luotThangTien,
      kyTruoc: truoc?.luotThangTien,
      moTaNguon: "employment_histories (quyết định bổ nhiệm)",
    },
  };

  if (nay.tyLeVangMat !== null) {
    soThat.absenteeism = {
      giaTri: nay.tyLeVangMat,
      kyTruoc: truoc?.tyLeVangMat ?? undefined,
      moTaNguon: "timesheets (nghỉ không lương + ốm / tổng công)",
    };
  }
  if (nay.gioLamThem !== null) {
    soThat["overtime-rate"] = {
      giaTri: nay.gioLamThem,
      kyTruoc: truoc?.gioLamThem ?? undefined,
      moTaNguon: "timesheets (tổng giờ làm thêm của kỳ)",
    };
  }

  /** Chỉ số chưa có nguồn thật — nêu rõ còn thiếu gì. */
  const chuaCo: Record<string, string> = {
    "vuot-thu-viec":
      "mốc đánh giá kết thúc thử việc — sẽ có khi phân hệ Đánh giá được bổ sung",
    "ho-so-phap-ly":
      "quy định hồ sơ bắt buộc theo từng loại hợp đồng để chấm đủ/thiếu",
    "key-talent-retention": "cờ nhân sự cốt cán trên hồ sơ nhân viên",
  };

  const nhomMoi = baoCao.nhom.map((n) => ({
      ...n,
      chiSo: n.chiSo.map((cs) => {
        const that = soThat[cs.ma];
        if (that) {
          return {
            ...cs,
            nguon: {
              co: true as const,
              giaTri: that.giaTri,
              kyTruoc: that.kyTruoc,
              moTaNguon: that.moTaNguon,
            },
          };
        }
        if (chuaCo[cs.ma]) {
          return {
            ...cs,
            nguon: { co: false as const, canGi: chuaCo[cs.ma] },
          };
        }
        return cs;
      }),
    }));

  // Đếm lại hai con số của dải tóm tắt: số chỉ số có/chưa có nguồn vừa đổi.
  const tatCa = nhomMoi.flatMap((n) => n.chiSo);
  return {
    ...baoCao,
    nhom: nhomMoi,
    soChiSoCoSoLieu: tatCa.filter((cs) => coSoLieu(cs.nguon)).length,
    soChiSoChuaCoNguon: tatCa.filter((cs) => !coSoLieu(cs.nguon)).length,
  };
}
