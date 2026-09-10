import dayjs, { type Dayjs } from "dayjs";
import type { Employee } from "@/services/employeeService";
import type { LaborContract } from "@/services/laborContractService";
import type { AttendanceRequest } from "@/services/attendanceRequestService";
import type { Resignation } from "@/services/resignationService";

/**
 * Số liệu cho Trang chủ — tính hoàn toàn phía client từ các danh sách sẵn có.
 *
 * Mỗi nguồn có thể VẮNG (`undefined`) khi người xem không có quyền đọc nó;
 * chỉ số phụ thuộc nguồn đó trả `null` = "không có dữ liệu" (hiện "—"), KHÔNG
 * được trả 0 — số 0 đọc như "chỉ tiêu này bằng không".
 */

/** Hợp đồng còn ≤ ngần này ngày thì coi là sắp hết hạn. */
export const NGUONG_SAP_HET_HAN = 30;

const ngay = (s?: string | null): Dayjs | null => {
  if (!s) return null;
  const d = dayjs(s);
  return d.isValid() ? d : null;
};

const cungThang = (s: string | undefined | null, moc: Dayjs) => {
  const d = ngay(s);
  return !!d && d.year() === moc.year() && d.month() === moc.month();
};

export interface ChiSoTongQuan {
  /** Nhân sự hiện có = hồ sơ chưa ở trạng thái đã nghỉ. */
  tongNhanSu: number | null;
  dangLamViec: number | null;
  thuViec: number | null;
  tamNghi: number | null;
  vaoTrongThang: number | null;
  nghiTrongThang: number | null;
  hopDongSapHetHan: number | null;
  donChoDuyet: number | null;
}

export interface NguonTongQuan {
  nhanVien?: Employee[];
  hopDong?: LaborContract[];
  donChamCong?: AttendanceRequest[];
  thoiViec?: Resignation[];
}

export function tinhChiSo(nguon: NguonTongQuan, homNay: Dayjs = dayjs()): ChiSoTongQuan {
  const { nhanVien, hopDong, donChamCong, thoiViec } = nguon;
  const conLam = nhanVien?.filter((e) => e.trangThai !== "da_nghi");
  return {
    tongNhanSu: conLam ? conLam.length : null,
    dangLamViec: nhanVien ? nhanVien.filter((e) => e.trangThai === "dang_lam_viec").length : null,
    thuViec: conLam ? conLam.filter((e) => e.loaiHopDong === "thu_viec").length : null,
    tamNghi: nhanVien ? nhanVien.filter((e) => e.trangThai === "tam_nghi").length : null,
    vaoTrongThang: nhanVien ? nhanVien.filter((e) => cungThang(e.ngayVaoLam, homNay)).length : null,
    // Chỉ đơn đã HOÀN THÀNH mới là nghỉ thật — đơn chờ/đã duyệt còn có thể rút.
    nghiTrongThang: thoiViec
      ? thoiViec.filter((t) => t.trangThai === "hoan_thanh" && cungThang(t.ngayLamViecCuoi, homNay)).length
      : null,
    hopDongSapHetHan: hopDong ? hopDongSapHetHan(hopDong, homNay).length : null,
    donChoDuyet: donChamCong ? donChamCong.filter((d) => d.trangThai === "cho_duyet").length : null,
  };
}

export interface HopDongSapHet {
  hopDong: LaborContract;
  /** Số ngày còn lại tới ngày kết thúc; âm = đã quá hạn mà vẫn đang hiệu lực. */
  conLai: number;
}

/** Hợp đồng đang hiệu lực, có ngày kết thúc, còn ≤ `soNgay` ngày (gồm cả đã quá hạn). Gần hạn nhất trước. */
export function hopDongSapHetHan(
  hopDong: LaborContract[],
  homNay: Dayjs = dayjs(),
  soNgay = NGUONG_SAP_HET_HAN,
): HopDongSapHet[] {
  const moc = homNay.startOf("day");
  return hopDong
    .filter((h) => h.trangThai === "dang_hieu_luc")
    .map((h) => {
      const ket = ngay(h.ngayKetThuc);
      return ket ? { hopDong: h, conLai: ket.startOf("day").diff(moc, "day") } : null;
    })
    .filter((x): x is HopDongSapHet => !!x && x.conLai <= soNgay)
    .sort((a, b) => a.conLai - b.conLai);
}

export interface DiemBienDong {
  /** Nhãn trục X, vd "T9". */
  thang: string;
  /** Năm-tháng, vd "2026-09" — khoá và tooltip. */
  ky: string;
  vao: number;
  /** Số người nghỉ, để ÂM cho cột vẽ xuống dưới trục 0 (như cột Chi ở ke-toan-so). */
  ra: number;
  /** Quy mô nhân sự cuối tháng. */
  tong: number;
}

/**
 * Biến động nhân sự `soThang` tháng gần nhất (tính cả tháng này).
 *
 * Quy mô tháng hiện tại NEO vào đúng số nhân sự đang có (hồ sơ chưa "đã nghỉ")
 * — cùng con số với thẻ "Tổng nhân sự", để hai chỗ trên cùng một màn không
 * lệch nhau. Các tháng trước tính LÙI: quy mô tháng trước = quy mô tháng sau
 * − số vào của tháng sau + số ra của tháng sau. Hồ sơ bị chuyển "đã nghỉ"
 * bằng tay mà không có đơn thôi việc thì không biết nghỉ tháng nào — con số
 * các tháng cũ là ước lượng tốt nhất từ dữ liệu có.
 */
export function bienDongTheoThang(
  nhanVien: Employee[],
  thoiViec: Resignation[] | undefined,
  homNay: Dayjs = dayjs(),
  soThang = 12,
): DiemBienDong[] {
  const nghiXong = (thoiViec ?? [])
    .filter((t) => t.trangThai === "hoan_thanh")
    .map((t) => ngay(t.ngayLamViecCuoi))
    .filter((d): d is Dayjs => !!d);

  const diem = Array.from({ length: soThang }, (_, i) => {
    const moc = homNay.subtract(soThang - 1 - i, "month");
    const vao = nhanVien.filter((e) => cungThang(e.ngayVaoLam, moc)).length;
    const ra = nghiXong.filter((d) => d.year() === moc.year() && d.month() === moc.month()).length;
    return { thang: `T${moc.month() + 1}`, ky: moc.format("YYYY-MM"), vao, ra: -ra, tong: 0 };
  });

  let quyMo = nhanVien.filter((e) => e.trangThai !== "da_nghi").length;
  for (let i = diem.length - 1; i >= 0; i--) {
    diem[i].tong = Math.max(0, quyMo);
    quyMo = quyMo - diem[i].vao - diem[i].ra; // ra đang âm → cộng lại số người nghỉ
  }
  return diem;
}

export interface ONhom {
  ten: string;
  soLuong: number;
}

/** Đếm theo một khoá, nhiều nhất trước; khoá rỗng gom vào `tenTrong`. */
export function demTheo<T>(
  ds: T[],
  khoa: (x: T) => string | null | undefined,
  tenTrong = "Chưa xếp",
): ONhom[] {
  const dem = new Map<string, number>();
  for (const x of ds) {
    const k = khoa(x) || tenTrong;
    dem.set(k, (dem.get(k) ?? 0) + 1);
  }
  return [...dem.entries()]
    .map(([ten, soLuong]) => ({ ten, soLuong }))
    .sort((a, b) => b.soLuong - a.soLuong || a.ten.localeCompare(b.ten, "vi"));
}
