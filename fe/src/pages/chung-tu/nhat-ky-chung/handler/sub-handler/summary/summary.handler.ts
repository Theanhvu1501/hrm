import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService, SummaryType, GetEntriesParams } from "@/services/nhatKyChungService";
import { message } from "antd";
import { NhatKyChungStates, NhatKyChungEvents } from "../../nhat-ky-chung.handler";
import "./summary.event";
import "./summary.state";

// Map summary type to state key
const SUMMARY_STATE_MAP: Record<SummaryType, string> = {
  account: "summaryByAccount",
  team: "summaryByTeam",
  employee: "summaryByEmployee",
  project: "summaryByProject",
  investor: "summaryByChuDauTu",
  product: "summaryBySanPham",
  "cash-flow": "summaryByDongTien",
  "management-group": "summaryByNhomQuanLy",
  "promotion-group": "summaryByNhomKhuyenMai",
};

// Map summary type to display name for error messages
const SUMMARY_DISPLAY_NAME: Record<SummaryType, string> = {
  account: "tài khoản",
  team: "đội",
  employee: "nhân viên",
  project: "dự án",
  investor: "chủ đầu tư",
  product: "sản phẩm",
  "cash-flow": "dòng tiền",
  "management-group": "nhóm quản lý",
  "promotion-group": "nhóm khuyến mại",
};

@RegisterHandler("nhat-ky-chung")
export class SummaryHandler extends CSubHanlder<NhatKyChungEvents, NhatKyChungStates> {
  @HandlerDecorator("loadSummary")
  async loadSummary(params: { type: SummaryType }): Promise<void> {
    const { type } = params;
    const stateKey = SUMMARY_STATE_MAP[type];
    const displayName = SUMMARY_DISPLAY_NAME[type];

    // Update loading state
    const currentLoading = (this.getState("summaryLoading") || {}) as Record<string, boolean>;
    this.setState("summaryLoading", { ...currentLoading, [type]: true });

    try {
      // Build query params from current filter state
      const queryParams = this.buildQueryParams();
      
      // Call API
      const data = await nhatKyChungService.getSummary(type, queryParams);

      // Map response to state format
      const mappedData = this.mapSummaryData(type, data);
      
      // Update state
      this.setState(stateKey as keyof NhatKyChungStates, mappedData as never);
    } catch (error) {
      console.error(`Error loading ${type} summary:`, error);
      message.error(`Không thể tải dữ liệu tổng hợp theo ${displayName}`);
    } finally {
      const updatedLoading = (this.getState("summaryLoading") || {}) as Record<string, boolean>;
      this.setState("summaryLoading", { ...updatedLoading, [type]: false });
    }
  }

  private buildQueryParams(): GetEntriesParams {
    const searchText = (this.getState("searchText") as string) || "";
    const dateRange = this.getState("dateRange") as
      | [{ format: (f: string) => string }, { format: (f: string) => string }]
      | null;
    const filterLoaiChungTu = this.getState("filterLoaiChungTu") as string | undefined;
    const filterAccount = this.getState("filterAccount") as string | undefined;
    const filterTaiKhoanCo = this.getState("filterTaiKhoanCo") as string | undefined;
    const filterDoiTuong = this.getState("filterDoiTuong") as string | undefined;
    const filterDuAn = this.getState("filterDuAn") as string | undefined;
    const filterBoPhan = this.getState("filterBoPhan") as string | undefined;

    const params: GetEntriesParams = {};

    if (searchText) params.search = searchText;
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.startDate = dateRange[0].format("YYYY-MM-DD");
      params.endDate = dateRange[1].format("YYYY-MM-DD");
    }
    if (filterLoaiChungTu) params.loai = filterLoaiChungTu as GetEntriesParams["loai"];
    if (filterAccount) params.taiKhoanNo = filterAccount;
    if (filterTaiKhoanCo) params.taiKhoanCo = filterTaiKhoanCo;
    if (filterDoiTuong) params.doiTuong = filterDoiTuong;
    if (filterDuAn) params.duAn = filterDuAn;
    if (filterBoPhan) params.boPhan = filterBoPhan;

    return params;
  }

  private mapSummaryData(type: SummaryType, data: { key: string; ten?: string; phatSinhNo: number; phatSinhCo: number; soLuong: number }[]) {
    // Map API response to state format based on type
    switch (type) {
      case "account":
        return data.map((item) => ({
          taiKhoan: item.key,
          phatSinhNo: item.phatSinhNo,
          phatSinhCo: item.phatSinhCo,
        }));
      case "team":
        return data.map((item) => ({
          doi: item.ten || item.key,
          tongChi: item.phatSinhCo,
          soButToan: item.soLuong,
          chiTiet: [],
        }));
      case "employee":
        return data.map((item) => ({
          nhanVien: item.ten || item.key,
          doi: "",
          tongChi: item.phatSinhCo,
          soButToan: item.soLuong,
        }));
      case "project":
        return data.map((item) => ({
          duAn: item.ten || item.key,
          tongThu: item.phatSinhNo,
          tongChi: item.phatSinhCo,
          soButToan: item.soLuong,
        }));
      case "investor":
        return data.map((item) => ({
          chuDauTu: item.ten || item.key,
          tongThu: item.phatSinhNo,
          tongChi: item.phatSinhCo,
          soButToan: item.soLuong,
        }));
      case "product":
        return data.map((item) => ({
          sanPham: item.ten || item.key,
          tongThu: item.phatSinhNo,
          tongChi: item.phatSinhCo,
          soButToan: item.soLuong,
        }));
      case "cash-flow":
        return data.map((item) => ({
          dongTien: item.ten || item.key,
          tongThu: item.phatSinhNo,
          tongChi: item.phatSinhCo,
          soButToan: item.soLuong,
        }));
      case "management-group":
        return data.map((item) => ({
          nhomQuanLy: item.ten || item.key,
          tongThu: item.phatSinhNo,
          tongChi: item.phatSinhCo,
          soButToan: item.soLuong,
        }));
      case "promotion-group":
        return data.map((item) => ({
          nhomKhuyenMai: item.ten || item.key,
          tongThu: item.phatSinhNo,
          tongChi: item.phatSinhCo,
          soButToan: item.soLuong,
        }));
      default:
        return data;
    }
  }
}
