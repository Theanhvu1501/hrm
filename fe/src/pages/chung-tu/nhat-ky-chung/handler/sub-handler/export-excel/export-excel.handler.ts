import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  nhatKyChungService,
  GetEntriesParams,
} from "@/services/nhatKyChungService";
import { NhatKyChung } from "@/types";
import { exportToExcel, ExcelColumn } from "@/utils/exportExcel";
import { message } from "antd";
import dayjs from "dayjs";
import "./export-excel.event";
import "./export-excel.state";
import { ExportExcelEvent } from "./export-excel.event";
import { NhatKyChungStates } from "../../nhat-ky-chung.handler";

const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: "Ngày Phát Sinh CT", dataKey: "ngay", width: 16 },
  { header: "Ngày ghi sổ", dataKey: "ngayGhiSo", width: 14 },
  { header: "Số CT", dataKey: "soPhieu", width: 12 },
  { header: "Loại GD", dataKey: "loaiGiaoDich", width: 15 },
  { header: "Nghiệp vụ", dataKey: "nghiepVu", width: 20 },
  { header: "Diễn giải", dataKey: "dienGiai", width: 30 },
  { header: "TK Nợ", dataKey: "taiKhoanNo", width: 10 },
  { header: "TK Có", dataKey: "taiKhoanCo", width: 10 },
  { header: "Số tiền", dataKey: "soTien", width: 15 },
  { header: "Mã ĐT nợ", dataKey: "doiTuongMa", width: 12 },
  { header: "ĐT nợ", dataKey: "doiTuongTen", width: 20 },
  { header: "Mã ĐT có", dataKey: "doiTuong2Ma", width: 12 },
  { header: "ĐT có", dataKey: "doiTuong2Ten", width: 20 },
  { header: "Mã DA", dataKey: "duAnMa", width: 12 },
  { header: "Dự án", dataKey: "duAnTen", width: 20 },
  { header: "Mã CĐT", dataKey: "chuDauTuMa", width: 12 },
  { header: "CĐT", dataKey: "chuDauTuTen", width: 20 },
  { header: "Mã SP", dataKey: "sanPhamMa", width: 12 },
  { header: "SP", dataKey: "sanPhamTen", width: 20 },
  { header: "Mã BP", dataKey: "boPhanMa", width: 10 },
  { header: "BP", dataKey: "boPhanTen", width: 15 },
  { header: "Mã Đội", dataKey: "doiMa", width: 10 },
  { header: "Đội", dataKey: "doiTen", width: 15 },
  { header: "Mã NV", dataKey: "nhanVienMa", width: 10 },
  { header: "NV", dataKey: "nhanVienTen", width: 15 },
  { header: "Mã DT", dataKey: "dongTienMa", width: 10 },
  { header: "Dòng tiền", dataKey: "dongTienTen", width: 15 },
  { header: "Mã KM", dataKey: "khoanMucMa", width: 10 },
  { header: "Khoản mục", dataKey: "khoanMucTen", width: 15 },
  { header: "Mã NKM", dataKey: "nhomKhuyenMaiMa", width: 10 },
  { header: "Nhóm KM", dataKey: "nhomKhuyenMaiTen", width: 15 },
  { header: "Mã NQL", dataKey: "nhomQuanLyMa", width: 10 },
  { header: "Nhóm QL", dataKey: "nhomQuanLyTen", width: 15 },
  { header: "Số HĐ", dataKey: "hopDongSo", width: 12 },
  { header: "Hợp đồng", dataKey: "hopDongTen", width: 20 },
  { header: "Số TK", dataKey: "soTaiKhoan", width: 12 },
  { header: "Người GD", dataKey: "nguoiGiaoDich", width: 18 },
  { header: "Địa chỉ", dataKey: "diaChi", width: 25 },
  { header: "Ghi chú", dataKey: "ghiChu", width: 25 },
];

@RegisterHandler("nhat-ky-chung")
export class ExportExcelHandler extends CSubHanlder<ExportExcelEvent, NhatKyChungStates> {
  @HandlerDecorator("exportExcel")
  async exportExcel(): Promise<void> {
    this.setState("exportingExcel", true);
    try {
      const params = this.buildExportParams();
      const allEntries = await this.fetchAllEntries(params);

      if (allEntries.length === 0) {
        message.warning("Không có dữ liệu để xuất");
        return;
      }

      const data = allEntries.map((entry: NhatKyChung) => ({
        ngay: dayjs(entry.ngay).format("DD/MM/YYYY"),
        ngayGhiSo: dayjs(entry.ngayGhiSo || entry.ngay).format("DD/MM/YYYY"),
        soPhieu: entry.soPhieu,
        loaiGiaoDich: entry.danhMuc?.loaiGiaoDich?.ten ?? "",
        nghiepVu: entry.danhMuc?.nghiepVu?.ten ?? "",
        dienGiai: entry.dienGiai,
        taiKhoanNo: entry.taiKhoanNo,
        taiKhoanCo: entry.taiKhoanCo,
        soTien: entry.soTien,
        doiTuongMa: entry.danhMuc?.doiTuong?.ma ?? "",
        doiTuongTen: entry.danhMuc?.doiTuong?.ten ?? "",
        doiTuong2Ma: entry.danhMuc?.doiTuong2?.ma ?? "",
        doiTuong2Ten: entry.danhMuc?.doiTuong2?.ten ?? "",
        duAnMa: entry.danhMuc?.duAn?.ma ?? "",
        duAnTen: entry.danhMuc?.duAn?.ten ?? "",
        chuDauTuMa: entry.danhMuc?.duAn?.chuDauTuMa ?? "",
        chuDauTuTen: entry.danhMuc?.duAn?.chuDauTuTen ?? "",
        sanPhamMa: entry.danhMuc?.sanPham?.ma ?? "",
        sanPhamTen: entry.danhMuc?.sanPham?.ten ?? "",
        boPhanMa: entry.danhMuc?.boPhan?.ma ?? "",
        boPhanTen: entry.danhMuc?.boPhan?.ten ?? "",
        doiMa: entry.danhMuc?.doi?.ma ?? "",
        doiTen: entry.danhMuc?.doi?.ten ?? "",
        nhanVienMa: entry.danhMuc?.nhanVien?.ma ?? "",
        nhanVienTen: entry.danhMuc?.nhanVien?.ten ?? "",
        dongTienMa: entry.danhMuc?.dongTien?.ma ?? "",
        dongTienTen: entry.danhMuc?.dongTien?.ten ?? "",
        khoanMucMa: entry.danhMuc?.khoanMuc?.ma ?? "",
        khoanMucTen: entry.danhMuc?.khoanMuc?.ten ?? "",
        nhomKhuyenMaiMa: entry.danhMuc?.nhomKhuyenMai?.ma ?? "",
        nhomKhuyenMaiTen: entry.danhMuc?.nhomKhuyenMai?.ten ?? "",
        nhomQuanLyMa: entry.danhMuc?.nhomQuanLy?.ma ?? "",
        nhomQuanLyTen: entry.danhMuc?.nhomQuanLy?.ten ?? "",
        hopDongSo: entry.danhMuc?.hopDong?.ma ?? "",
        hopDongTen: entry.danhMuc?.hopDong?.ten ?? "",
        soTaiKhoan: (entry as Record<string, unknown>).soTaiKhoan as string ?? "",
        nguoiGiaoDich: entry.nguoiGiaoDich ?? "",
        diaChi: entry.diaChi ?? "",
        ghiChu: entry.ghiChu ?? "",
      }));

      exportToExcel({
        title: "NHẬT KÝ CHUNG",
        columns: EXCEL_COLUMNS,
        data,
        fileName: `nhat-ky-chung-${dayjs().format("YYYYMMDD-HHmmss")}`,
        sheetName: "Nhật ký chung",
      });

      message.success(`Đã xuất ${data.length} dòng ra Excel`);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      message.error("Không thể xuất Excel. Vui lòng thử lại.");
    } finally {
      this.setState("exportingExcel", false);
    }
  }

  private async fetchAllEntries(params: GetEntriesParams): Promise<NhatKyChung[]> {
    const PAGE_SIZE = 100;
    const allEntries: NhatKyChung[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await nhatKyChungService.getEntries({
        ...params,
        page: currentPage,
        limit: PAGE_SIZE,
      });

      allEntries.push(...response.data);
      totalPages = response.meta.totalPages;
      currentPage++;
    } while (currentPage <= totalPages);

    return allEntries;
  }

  private buildExportParams(): GetEntriesParams {
    const searchText = (this.getState("searchText") as string) || "";
    const dateRange = this.getState("dateRange") as
      | [{ format: (f: string) => string }, { format: (f: string) => string }]
      | null;
    const filterLoaiChungTu = this.getState("filterLoaiChungTu") as
      | string
      | undefined;
    const filterAccount = this.getState("filterAccount") as
      | string
      | undefined;
    const filterTaiKhoanCo = this.getState("filterTaiKhoanCo") as
      | string
      | undefined;
    const filterDoiTuong = this.getState("filterDoiTuong") as
      | string
      | undefined;
    const filterDuAn = this.getState("filterDuAn") as string | undefined;
    const filterBoPhan = this.getState("filterBoPhan") as string | undefined;

    const params: GetEntriesParams = {};
    if (searchText) params.search = searchText;
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.startDate = dateRange[0].format("YYYY-MM-DD");
      params.endDate = dateRange[1].format("YYYY-MM-DD");
    }
    if (filterLoaiChungTu)
      params.loai = filterLoaiChungTu as GetEntriesParams["loai"];
    if (filterAccount) params.taiKhoanNo = filterAccount;
    if (filterTaiKhoanCo) params.taiKhoanCo = filterTaiKhoanCo;
    if (filterDoiTuong) params.doiTuong = filterDoiTuong;
    if (filterDuAn) params.duAn = filterDuAn;
    if (filterBoPhan) params.boPhan = filterBoPhan;

    return params;
  }
}
