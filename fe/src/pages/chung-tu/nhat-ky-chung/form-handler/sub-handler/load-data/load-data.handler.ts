import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import dayjs from "dayjs";
import "./load-data.event";
import { NhatKyChungFormStates, NhatKyChungFormEvents } from "../../nhat-ky-chung-form.handler";
import { ChungTuHeader, ChungTuChiTiet } from "../init/init.state";
import { NhatKyChung, DoiTuong, DuAn, BoPhan, SanPham, DongTien, NhomKhuyenMai, NhomQuanLy, QuyChuan, HopDong, TaiKhoanNganHang } from "@/types";
import { KhoanMucItem } from "../init/init.state";

@RegisterHandler("nhat-ky-chung-form")
export class LoadDataFormHandler extends CSubHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  @HandlerDecorator("loadDataBySoPhieu")
  async loadDataBySoPhieu(params: { soPhieu: string }): Promise<void> {
    this.setState("loading", true);

    try {
      // Lấy tất cả items có cùng soPhieu
      const items = await nhatKyChungService.getBySoPhieu(params.soPhieu);

      if (items.length > 0) {
        // Header từ item đầu tiên
        const first = items[0];

        // Lấy loaiGiaoDich từ quyChaunList dựa trên nghiệp vụ
        const quyChaunList = (this.getState("quyChaunList") as QuyChuan[]) || [];
        const nghiepVu = first.danhMuc?.nghiepVu?.ma || first.danhMuc?.loaiChungTu?.ma || first.danhMuc?.loaiGiaoDich?.ma;
        const quyChuan = quyChaunList.find((qc) => qc.nghiepVu === nghiepVu);
        // Ưu tiên loaiGiaoDich đã lưu trên phiếu; chỉ suy luận từ quyChuan khi phiếu chưa có.
        // Tránh trường hợp cùng nghiệp vụ dùng cho cả bán hàng lẫn mua hàng → .find() lấy nhầm quy chuẩn đầu tiên.
        const loaiGiaoDich = first.danhMuc?.loaiGiaoDich?.ma || quyChuan?.loaiGiaoDich;

        const header: ChungTuHeader = {
          soPhieu: first.soPhieu,
          ngay: dayjs(first.ngay),
          ngayGhiSo: dayjs(first.ngayGhiSo || first.ngay),
          loaiGiaoDich: loaiGiaoDich,
          loai: nghiepVu,
          loaiTen: first.danhMuc?.nghiepVu?.ten || first.danhMuc?.loaiChungTu?.ten || first.danhMuc?.loaiGiaoDich?.ten || first.loaiChungTu,
          dienGiaiChung: first.dienGiai,
          nguoiGiaoDich: first.nguoiGiaoDich,
          diaChi: first.diaChi,
          ghiChu: first.ghiChu,
        };
        this.setState("header", header);

        // Lọc nghiệp vụ theo loại giao dịch để hiển thị đúng trong dropdown
        if (loaiGiaoDich) {
          const filtered = quyChaunList
            .filter((qc) => qc.loaiGiaoDich === loaiGiaoDich)
            .map((qc) => ({
              value: qc.nghiepVu,
              label: qc.nghiepVu,
            }));
          this.setState("filteredNghiepVuList", filtered);
        }

        // Chi tiết từ tất cả items
        const chiTietList: ChungTuChiTiet[] = items.map((item) => this.mapItemToChiTiet(item));
        this.setState("chiTietList", chiTietList);
      }
    } catch (error) {
      console.error("Error loading data by soPhieu:", error);
    } finally {
      this.setState("loading", false);
    }
  }

  private mapItemToChiTiet(item: NhatKyChung): ChungTuChiTiet {
    const danhMuc = item.danhMuc;
    const doiTuongList = (this.getState("doiTuongList") as DoiTuong[]) || [];
    const duAnList = (this.getState("duAnList") as DuAn[]) || [];
    const boPhanList = (this.getState("boPhanList") as BoPhan[]) || [];
    const sanPhamList = (this.getState("sanPhamList") as SanPham[]) || [];
    const dongTienList = (this.getState("dongTienList") as DongTien[]) || [];
    const nhomKhuyenMaiList = (this.getState("nhomKhuyenMaiList") as NhomKhuyenMai[]) || [];
    const nhomQuanLyList = (this.getState("nhomQuanLyList") as NhomQuanLy[]) || [];
    const khoanMucList = (this.getState("khoanMucList") as KhoanMucItem[]) || [];
    const hopDongList = (this.getState("hopDongList") as HopDong[]) || [];
    const nganHangList = (this.getState("nganHangList") as TaiKhoanNganHang[]) || [];

    // Find IDs from master data based on danhMuc snapshots
    // Đối tượng có thể là ngân hàng/quỹ (loai NGAN_HANG_QUY) → tìm ở danh mục tương ứng
    const findDoiTuongId = (snap?: { ma?: string; loai?: string }): string | undefined => {
      if (!snap?.ma) return undefined;
      if (snap.loai === "NGAN_HANG_QUY") {
        return nganHangList.find((nh) => nh.ma === snap.ma)?.id;
      }
      return doiTuongList.find((d) => d.ma === snap.ma)?.id;
    };
    const doiTuongId = findDoiTuongId(danhMuc?.doiTuong);
    const doiTuong2Id = findDoiTuongId(danhMuc?.doiTuong2);
    const duAn = danhMuc?.duAn ? duAnList.find((d) => d.ma === danhMuc.duAn?.ma) : undefined;
    const boPhan = danhMuc?.boPhan ? boPhanList.find((b) => b.ma === danhMuc.boPhan?.ma) : undefined;
    const doi = danhMuc?.doi ? boPhanList.find((b) => b.ma === danhMuc.doi?.ma) : undefined;
    const nhanVien = danhMuc?.nhanVien ? doiTuongList.find((d) => d.ma === danhMuc.nhanVien?.ma) : undefined;
    const sanPham = danhMuc?.sanPham ? sanPhamList.find((s) => s.ma === danhMuc.sanPham?.ma) : undefined;
    const dongTien = danhMuc?.dongTien ? dongTienList.find((d) => d.ma === danhMuc.dongTien?.ma) : undefined;
    const nhomKhuyenMai = danhMuc?.nhomKhuyenMai ? nhomKhuyenMaiList.find((n) => n.ma === danhMuc.nhomKhuyenMai?.ma) : undefined;
    const nhomQuanLy = danhMuc?.nhomQuanLy ? nhomQuanLyList.find((n) => n.ma === danhMuc.nhomQuanLy?.ma) : undefined;
    const khoanMuc = danhMuc?.khoanMuc ? khoanMucList.find((k) => k.ma === danhMuc.khoanMuc?.ma) : undefined;
    const hopDong = danhMuc?.hopDong ? hopDongList.find((h) => h.soHopDong === danhMuc.hopDong?.soHopDong) : undefined;

    // Lấy nghiệp vụ từ danhMuc của từng dòng (nghiepVu hoặc loaiChungTu cho backward compatibility)
    const nghiepVu = danhMuc?.nghiepVu?.ma || danhMuc?.loaiChungTu?.ma;
    const nghiepVuTen = danhMuc?.nghiepVu?.ten || danhMuc?.loaiChungTu?.ten;

    return {
      key: item.id,
      id: item.id,
      taiKhoanNo: item.taiKhoanNo || "",
      taiKhoanCo: item.taiKhoanCo || "",
      soTien: item.soTien,
      noiDung: item.dienGiai,
      soTaiKhoan: item.soTaiKhoan,

      // Nghiệp vụ cho từng dòng
      nghiepVu: nghiepVu,
      nghiepVuTen: nghiepVuTen,

      // IDs
      doiTuongId: doiTuongId,
      doiTuong2Id: doiTuong2Id,
      duAnId: duAn?.id,
      boPhanId: boPhan?.id,
      doiId: doi?.id,
      nhanVienId: nhanVien?.id,
      sanPhamId: sanPham?.id,
      dongTienId: dongTien?.id,
      nhomKhuyenMaiId: nhomKhuyenMai?.id,
      nhomQuanLyId: nhomQuanLy?.id,
      khoanMucId: khoanMuc?.id,
      hopDongId: hopDong?.id,

      // Snapshots
      doiTuongSnapshot: danhMuc?.doiTuong as Record<string, unknown>,
      doiTuong2Snapshot: danhMuc?.doiTuong2 as Record<string, unknown>,
      duAnSnapshot: danhMuc?.duAn as Record<string, unknown>,
      boPhanSnapshot: danhMuc?.boPhan as Record<string, unknown>,
      doiSnapshot: danhMuc?.doi as Record<string, unknown>,
      nhanVienSnapshot: danhMuc?.nhanVien as Record<string, unknown>,
      sanPhamSnapshot: danhMuc?.sanPham as Record<string, unknown>,
      dongTienSnapshot: danhMuc?.dongTien as Record<string, unknown>,
      nhomKhuyenMaiSnapshot: danhMuc?.nhomKhuyenMai as Record<string, unknown>,
      nhomQuanLySnapshot: danhMuc?.nhomQuanLy as Record<string, unknown>,
      khoanMucSnapshot: danhMuc?.khoanMuc as Record<string, unknown>,
      hopDongSnapshot: danhMuc?.hopDong as Record<string, unknown>,
    };
  }
}
