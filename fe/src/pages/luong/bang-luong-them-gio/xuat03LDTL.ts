import {
  NUM_FMT,
  type ReportCol,
  type ReportRow,
  type ReportSheet,
} from "@/utils/exportReportExcel";
import { NHAN_LOAI_NGAY } from "@/services/cauHinhLuongService";
import type { DongLuongThemGio } from "@/services/bangLuongThemGioService";

/**
 * Dựng mô hình sheet cho mẫu số 03-LĐTL "Bảng thanh toán tiền làm thêm giờ".
 *
 * Đây là BIỂU MẪU PHÁP ĐỊNH có chỗ ký (Người lập / Kế toán / Giám đốc), không
 * phải một bảng dữ liệu — đầu đề, số hiệu mẫu và khối chữ ký phải in đúng, nếu
 * không thì bản in không dùng để bàn giao được.
 *
 * Cột sinh động theo tập loại ngày có trong dữ liệu, gộp từ MỌI dòng (nhân
 * viên đầu tiên có thể không làm ca đêm), và in ĐỦ kể cả loại 0 giờ: in cột
 * trống đúng biểu mẫu tốt hơn là bỏ cột rồi khác mẫu.
 */
export function dung03LDTL(
  thang: string,
  dsDong: DongLuongThemGio[],
  tenCongTy: string,
): ReportSheet {
  const cacLoai = Array.from(
    new Set(dsDong.flatMap((d) => Object.keys(d.theoLoai ?? {}))),
  );

  const nhomLoai: ReportCol[] = cacLoai.map((loai) => ({
    key: loai,
    header: NHAN_LOAI_NGAY[loai] ?? loai,
    children: [
      { key: `${loai}__soGio`, header: "Số giờ", align: "right", width: 10 },
      {
        key: `${loai}__thanhTien`,
        header: "Thành tiền",
        align: "right",
        numFmt: NUM_FMT,
        width: 16,
      },
    ],
  }));

  const columns: ReportCol[] = [
    { key: "stt", header: "Số TT", width: 7, align: "center" },
    { key: "hoTen", header: "Họ và tên", width: 26 },
    {
      key: "luongThang",
      header: "Tiền lương tháng",
      align: "right",
      numFmt: NUM_FMT,
      width: 16,
    },
    {
      key: "mucLuong",
      header: "Mức lương",
      children: [
        {
          key: "donGiaNgay",
          header: "Ngày",
          align: "right",
          numFmt: NUM_FMT,
          width: 14,
        },
        {
          key: "donGiaGio",
          header: "Giờ",
          align: "right",
          numFmt: NUM_FMT,
          width: 14,
        },
      ],
    },
    ...nhomLoai,
    {
      key: "tongTien",
      header: "Tổng cộng tiền",
      align: "right",
      numFmt: NUM_FMT,
      width: 16,
    },
    { key: "gioNghiBu", header: "Số giờ nghỉ bù", align: "right", width: 14 },
    {
      key: "thucNhan",
      header: "Thực nhận",
      align: "right",
      numFmt: NUM_FMT,
      width: 16,
    },
  ];

  const rows: ReportRow[] = dsDong.map((d, i) => {
    const cells: Record<string, string | number | null> = {
      stt: i + 1,
      hoTen: d.employeeName ?? d.employeeCode ?? "",
      luongThang: d.luongThang,
      donGiaNgay: d.donGiaNgay,
      donGiaGio: d.donGiaGio,
      tongTien: d.tongTien,
      gioNghiBu: d.gioNghiBu,
      thucNhan: d.thucNhan,
    };
    for (const loai of cacLoai) {
      cells[`${loai}__soGio`] = d.theoLoai?.[loai]?.soGio ?? 0;
      cells[`${loai}__thanhTien`] = d.theoLoai?.[loai]?.thanhTien ?? 0;
    }
    return { cells };
  });

  const cong = (lay: (d: DongLuongThemGio) => number) =>
    dsDong.reduce((s, d) => s + lay(d), 0);

  const oTong: Record<string, string | number | null> = {
    hoTen: "Tổng cộng",
    tongTien: cong((d) => d.tongTien),
    gioNghiBu: cong((d) => d.gioNghiBu),
    thucNhan: cong((d) => d.thucNhan),
  };
  for (const loai of cacLoai) {
    oTong[`${loai}__soGio`] = cong((d) => d.theoLoai?.[loai]?.soGio ?? 0);
    oTong[`${loai}__thanhTien`] = cong(
      (d) => d.theoLoai?.[loai]?.thanhTien ?? 0,
    );
  }
  rows.push({ cells: oTong, bold: true, fill: "total" });

  // Khối chữ ký — phần làm nó thành sản phẩm bàn giao chứ không phải báo cáo.
  rows.push({ spacer: true });
  rows.push({
    cells: { hoTen: "Người lập", tongTien: "Kế toán", thucNhan: "Giám đốc" },
    bold: true,
  });
  rows.push({
    cells: {
      hoTen: "(ký và ghi rõ họ tên)",
      tongTien: "(ký và ghi rõ họ tên)",
      thucNhan: "(ký và ghi rõ họ tên)",
    },
  });

  const [nam, thangSo] = thang.split("-");
  return {
    name: "LÀM THÊM GIỜ",
    title: "BẢNG THANH TOÁN TIỀN LÀM THÊM GIỜ",
    meta: [tenCongTy, "Mẫu số: 03 - LĐTL", `Tháng ${thangSo} năm ${nam}`],
    columns,
    rows,
  };
}
