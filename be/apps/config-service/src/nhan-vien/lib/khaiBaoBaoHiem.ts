import type { CauHinhLuongData, Employee } from '@app/entities';
import { ganCauHinhRieng, mucKhaiBaoApDung, tinhNenBHXH } from '@app/core';

/**
 * Một dòng của bảng KHAI BÁO LAO ĐỘNG gửi cơ quan bảo hiểm (yêu cầu d9 cột G:
 * "Thêm bảng khai báo nhân sự: theo mẫu khai báo lao động theo Bảo hiểm").
 *
 * Cột bám theo mẫu D02-LT: định danh người lao động, mức tiền lương làm căn cứ
 * đóng, và mốc bắt đầu đóng (báo tăng).
 */
export interface DongKhaiBaoBH {
  stt: number;
  maNhanVien: string;
  hoTen: string;
  soSoBH: string;
  cccd: string;
  ngaySinh: string;
  gioiTinh: string;
  diaChi: string;
  chucDanh: string;
  /** Tiền lương làm căn cứ đóng — theo đúng căn cứ đã chọn ở Cấu hình lương. */
  mucDong: number;
  /** Mốc báo tăng; trống = đóng từ khi vào làm. */
  tuNgay: string;
  ghiChu: string;
}

const GIOI_TINH: Record<string, string> = { nam: 'Nam', nu: 'Nữ', khac: 'Khác' };

/**
 * Dựng bảng khai báo từ danh sách hồ sơ.
 *
 * Mức đóng lấy qua `tinhNenBHXH` — CÙNG hàm mà bảng lương dùng, không dựng
 * lại công thức ở đây: hai công thức cho một con số thì bảng khai báo gửi cơ
 * quan bảo hiểm và tiền trừ trên phiếu lương sẽ lệch nhau, và chênh lệch đó
 * chỉ lộ ra khi cơ quan bảo hiểm đối chiếu.
 *
 * Người KHÔNG thuộc diện đóng (`dongBH` tắt) vẫn có mặt trong bảng nhưng mức
 * đóng để 0 và có ghi chú: danh sách thiếu người thì HR không biết là quên
 * khai hay là người đó không thuộc diện.
 */
export function dungBangKhaiBaoBH(
  nhanVien: Employee[],
  chung: CauHinhLuongData,
): DongKhaiBaoBH[] {
  return nhanVien.map((nv, i) => {
    const ch = ganCauHinhRieng(chung, nv.cauHinhLuongRieng);
    const mucDong = nv.dongBH
      ? tinhNenBHXH(
          {
            base: nv.luongThoaThuan ?? 0,
            mucKhaiBao: mucKhaiBaoApDung(nv.mucKhaiBao, ch.mucKhaiBaoMacDinh),
            phuCapCoDinh: nv.phuCapCoDinh ?? 0,
            giaTriKhoan: nv.giaTriKhoan,
            // Các trường còn lại của `DauVaoDongLuong` không tham gia vào nền
            // đóng bảo hiểm — nền đóng là con số của HỢP ĐỒNG, không phụ thuộc
            // công thực tế của một kỳ nào.
            congThuong: 0,
            congThuViec: 0,
            congKhac: 0,
            soNguoiPhuThuoc: 0,
            tamUng: 0,
            khauTruKhac: 0,
            dongBH: true,
            thoiVu: false,
            camKet: false,
            hopDongThu2: !!nv.hopDongThu2,
            nhapTheoKy: {},
            tienOt: 0,
            otMienThue: 0,
          },
          ch,
        )
      : 0;

    const ghiChu: string[] = [];
    if (!nv.dongBH) ghiChu.push('Không thuộc diện đóng BH');
    if (nv.hopDongThu2) ghiChu.push('HĐLĐ thứ 2 — đã đóng ở đơn vị khác');
    if (nv.dongBH && !nv.soSoBH) ghiChu.push('Chưa có số sổ BHXH');

    return {
      stt: i + 1,
      maNhanVien: nv.employeeId ?? '',
      hoTen: nv.hoTen ?? '',
      soSoBH: nv.soSoBH ?? '',
      cccd: nv.cccd ?? '',
      ngaySinh: nv.ngaySinh ?? '',
      gioiTinh: nv.gioiTinh ? GIOI_TINH[nv.gioiTinh] ?? nv.gioiTinh : '',
      diaChi: nv.diaChi ?? '',
      chucDanh: nv.chucDanh ?? '',
      mucDong,
      tuNgay: nv.ngayBatDauDongBH || nv.ngayVaoLam || '',
      ghiChu: ghiChu.join('; '),
    };
  });
}
