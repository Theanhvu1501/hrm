import type { CauHinhLuongData, DongLuong } from '@app/entities';
import { tinhNenBHXH } from './tinh-luong';
import { ganCauHinhRieng } from './gan-cau-hinh-rieng';

/**
 * Ba bảng tổng hợp đọc từ DÒNG LƯƠNG đã tổng hợp của kỳ (yêu cầu d33 BHXH,
 * d34 quyết toán TNCN theo kỳ tự chọn, d35 Công đoàn).
 *
 * Vì sao đọc dòng lương chứ không đọc hồ sơ nhân viên: dòng lương là ẢNH CHỤP
 * của kỳ (lương, phụ cấp, cấu hình áp dụng, số người phụ thuộc tại thời điểm
 * đó). Tính lại từ hồ sơ hiện tại thì bảng BHXH tháng 3 in ra hôm nay sẽ mang
 * mức lương của người ta sau đợt tăng lương tháng 6 — và không ai đối chiếu
 * được với số đã nộp.
 *
 * Hàm THUẦN, không TypeORM: mọi phép chia tỷ lệ ở đây đi thẳng vào tờ khai
 * với cơ quan bảo hiểm/thuế nên phải test được từng cái một.
 */

/** Tỷ lệ trích theo TỪNG QUỸ, tổng 32% theo quy định hiện hành. */
export interface TyLeQuyBaoHiem {
  /** Ốm đau – thai sản (doanh nghiệp đóng). */
  omDauThaiSan: number;
  /** Hưu trí – tử tuất (NLĐ 8% + DN 14%). */
  huuTriTuTuat: number;
  /** BHYT (NLĐ 1,5% + DN 3%). */
  bhyt: number;
  /** BHTN (NLĐ 1% + DN 1%). */
  bhtn: number;
  /** BHTNLĐ – BNN (doanh nghiệp đóng). */
  tnldBnn: number;
}

/**
 * Mặc định theo bảng "BHXH" trong file yêu cầu của chủ sản phẩm:
 * 3% + 22% + 4,5% + 2% + 0,5% = 32%.
 */
export const TY_LE_QUY_MAC_DINH: TyLeQuyBaoHiem = {
  omDauThaiSan: 0.03,
  huuTriTuTuat: 0.22,
  bhyt: 0.045,
  bhtn: 0.02,
  tnldBnn: 0.005,
};

export interface DongBaoHiem {
  stt: number;
  employeeId: string;
  maNhanVien: string;
  hoTen: string;
  /** Tiền lương làm căn cứ đóng của kỳ. */
  mucDong: number;
  omDauThaiSan: number;
  huuTriTuTuat: number;
  bhyt: number;
  bhtn: number;
  tnldBnn: number;
  /** Tổng trích nộp của người này (cả hai phần). */
  cong: number;
  /** Phần NGƯỜI LAO ĐỘNG chịu — trừ vào lương. */
  nld: number;
  /** Phần DOANH NGHIỆP chịu. */
  dn: number;
}

function nenBHXHCuaDong(dong: DongLuong, chung: CauHinhLuongData): number {
  const ch = ganCauHinhRieng(chung, {
    congChuan: dong.cauHinhApDung?.congChuan,
    thuViecTyLe: dong.cauHinhApDung?.thuViecTyLe,
    bhxhTyLe: dong.cauHinhApDung?.bhxhTyLe,
    bhxhCanCu: dong.cauHinhApDung?.bhxhCanCu,
  });

  return tinhNenBHXH(
    {
      base: dong.luongThoaThuan ?? 0,
      mucKhaiBao: dong.mucKhaiBao ?? 0,
      phuCapCoDinh: dong.phuCapCoDinh ?? 0,
      giaTriKhoan: dong.giaTriKhoan,
      // Nền đóng không phụ thuộc công thực tế — xem `tinhNenBHXH`.
      congThuong: 0,
      congThuViec: 0,
      congKhac: 0,
      soNguoiPhuThuoc: 0,
      tamUng: 0,
      khauTruKhac: 0,
      dongBH: true,
      thoiVu: false,
      camKet: false,
      hopDongThu2: !!dong.hopDongThu2,
      nhapTheoKy: {},
      tienOt: 0,
      otMienThue: 0,
    },
    ch,
  );
}

/**
 * BẢNG TỔNG HỢP TRÍCH NỘP BHXH của một tháng (yêu cầu d33).
 *
 * Chỉ người CÓ ĐÓNG (`dongBH`) mới có mặt: bảng gửi cơ quan bảo hiểm mà liệt
 * kê cả người không thuộc diện là tự tạo ra việc giải trình.
 *
 * Người mang cờ HĐLĐ thứ 2 vẫn có mặt nhưng phần NLĐ = 0 và doanh nghiệp chỉ
 * chịu BHTNLĐ-BNN — đúng cách engine lương đang tính, không dựng lại luật ở
 * đây theo một cách hơi khác.
 */
export function dungBangBaoHiem(
  dsDongLuong: DongLuong[],
  chung: CauHinhLuongData,
  tyLeQuy: TyLeQuyBaoHiem = TY_LE_QUY_MAC_DINH,
): DongBaoHiem[] {
  const ra: DongBaoHiem[] = [];
  let stt = 0;

  for (const d of dsDongLuong) {
    if (!d.dongBH) continue;
    stt += 1;
    const mucDong = nenBHXHCuaDong(d, chung);
    const q = (tyLe: number) => Math.round(mucDong * tyLe);

    const omDauThaiSan = q(tyLeQuy.omDauThaiSan);
    const huuTriTuTuat = q(tyLeQuy.huuTriTuTuat);
    const bhyt = q(tyLeQuy.bhyt);
    const bhtn = q(tyLeQuy.bhtn);
    const tnldBnn = q(tyLeQuy.tnldBnn);

    // Phần NLĐ và phần DN lấy đúng tỷ lệ mà ENGINE LƯƠNG dùng, không tự cộng
    // lại từ các quỹ: cộng lại sẽ lệch với số đã trừ trên phiếu lương ngay khi
    // ai đó sửa một tỷ lệ mà quên sửa chỗ kia.
    const tyLeNld = d.hopDongThu2 ? 0 : (d.cauHinhApDung?.bhxhTyLe ?? chung.bhxh.tyLe);
    const tyLeDn = d.hopDongThu2
      ? chung.bhCongTy?.tyLeHopDongThu2 ?? 0
      : chung.bhCongTy?.tyLe ?? 0;

    ra.push({
      stt,
      employeeId: d.employeeId,
      maNhanVien: d.employeeCode ?? '',
      hoTen: d.employeeName ?? '',
      mucDong,
      omDauThaiSan,
      huuTriTuTuat,
      bhyt,
      bhtn,
      tnldBnn,
      cong: omDauThaiSan + huuTriTuTuat + bhyt + bhtn + tnldBnn,
      nld: Math.round(mucDong * tyLeNld),
      dn: Math.round(mucDong * tyLeDn),
    });
  }

  return ra;
}

export interface DongCongDoan {
  stt: number;
  employeeId: string;
  maNhanVien: string;
  hoTen: string;
  /** Căn cứ tính phí — cùng nền với BHXH. */
  mucDong: number;
  tyLe: number;
  soTien: number;
}

/**
 * DANH SÁCH PHÍ CÔNG ĐOÀN theo kỳ (yêu cầu d35).
 *
 * Cộng dồn nhiều tháng khi kỳ chọn dài hơn một tháng: mỗi tháng một dòng
 * lương, người ta cần một dòng cho cả kỳ.
 */
export function dungBangCongDoan(
  dsDongLuong: DongLuong[],
  chung: CauHinhLuongData,
): DongCongDoan[] {
  const tyLe = chung.phiCongDoan?.tyLe ?? 0;
  const theoNguoi = new Map<string, DongCongDoan>();

  for (const d of dsDongLuong) {
    if (!d.dongBH) continue;
    const mucDong = nenBHXHCuaDong(d, chung);
    const cu = theoNguoi.get(d.employeeId);
    if (cu) {
      cu.mucDong += mucDong;
      cu.soTien += Math.round(mucDong * tyLe);
      continue;
    }
    theoNguoi.set(d.employeeId, {
      stt: 0,
      employeeId: d.employeeId,
      maNhanVien: d.employeeCode ?? '',
      hoTen: d.employeeName ?? '',
      mucDong,
      tyLe,
      soTien: Math.round(mucDong * tyLe),
    });
  }

  return [...theoNguoi.values()]
    .sort((a, b) => a.maNhanVien.localeCompare(b.maNhanVien))
    .map((d, i) => ({ ...d, stt: i + 1 }));
}

export interface DongThueTheoKy {
  stt: number;
  employeeId: string;
  maNhanVien: string;
  hoTen: string;
  soKy: number;
  tongThuNhap: number;
  bhxh: number;
  /** Ăn ca dưới trần, chênh OT miễn thuế… — phần thu nhập không chịu thuế. */
  mienThue: number;
  giamTruGiaCanh: number;
  thuNhapTinhThue: number;
  thue: number;
}

/**
 * BẢNG TÍNH THUẾ TNCN theo kỳ TỰ CHỌN (yêu cầu d34: "theo chu kỳ Tự chọn /
 * Tháng / Quý / Năm").
 *
 * CỘNG số đã tính của từng tháng, KHÔNG tính lại thuế trên tổng kỳ: thuế
 * TNCN của người làm công ăn lương khấu trừ theo THÁNG, và tính lại trên tổng
 * quý sẽ ra một con số khác hẳn số đã khấu trừ thật. Quyết toán NĂM (tính lại
 * theo biểu năm) là việc riêng, đã có `quyetToanNam()`.
 *
 * `mucLay` chọn lấy kết quả theo mức KHAI BÁO hay mức THỰC TẾ — hai bảng mà
 * hệ thống vẫn luôn tách đôi.
 */
export function dungBangThueTheoKy(
  dsDongLuong: DongLuong[],
  mucLay: 'khaiBao' | 'thucTe' = 'khaiBao',
): DongThueTheoKy[] {
  const theoNguoi = new Map<string, DongThueTheoKy>();

  for (const d of dsDongLuong) {
    const kq = d[mucLay];
    if (!kq) continue;

    const cu = theoNguoi.get(d.employeeId) ?? {
      stt: 0,
      employeeId: d.employeeId,
      maNhanVien: d.employeeCode ?? '',
      hoTen: d.employeeName ?? '',
      soKy: 0,
      tongThuNhap: 0,
      bhxh: 0,
      mienThue: 0,
      giamTruGiaCanh: 0,
      thuNhapTinhThue: 0,
      thue: 0,
    };

    cu.soKy += 1;
    cu.tongThuNhap += kq.tongThuNhap ?? 0;
    cu.bhxh += kq.bhxh ?? 0;
    cu.mienThue += (kq.mienThueKhoan ?? 0) + (kq.otMienThue ?? 0);
    cu.giamTruGiaCanh += kq.giamTru ?? 0;
    cu.thuNhapTinhThue += kq.thuNhapTinhThue ?? 0;
    cu.thue += kq.thue ?? 0;

    theoNguoi.set(d.employeeId, cu);
  }

  return [...theoNguoi.values()]
    .sort((a, b) => a.maNhanVien.localeCompare(b.maNhanVien))
    .map((d, i) => ({ ...d, stt: i + 1 }));
}
