import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { DoiTuong, DuAn, BoPhan, SanPham, DongTien, QuyChuan, NhomKhuyenMai, NhomQuanLy, HopDong, LoaiGiaoDich, TaiKhoanNganHang, HoSoChungTu } from "@/types";
import { LoaiChungTuType } from "@/services/loaiChungTuService";

export interface MasterDataStates extends BaseStates {
  doiTuongList: DoiTuong[];
  duAnList: DuAn[];
  boPhanList: BoPhan[];
  sanPhamList: SanPham[];
  dongTienList: DongTien[];
  nhomKhuyenMaiList: NhomKhuyenMai[];
  nhomQuanLyList: NhomQuanLy[];
  hopDongList: HopDong[];
  quyChaunList: QuyChuan[];
  loaiChungTuList: LoaiChungTuType[];
  loaiGiaoDichList: LoaiGiaoDich[];
  nganHangList: TaiKhoanNganHang[];
  hoSoChungTuList: HoSoChungTu[];
  masterDataLoaded: boolean;
  masterDataLoading: boolean;
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungStates extends MasterDataStates {}
}
