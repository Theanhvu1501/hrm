import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { HopDong, DoiTuong } from "@/types";

export interface HopDongPageStates extends BaseStates {
  data: HopDong[];
  loading: boolean;
  searchText: string;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  stats: {
    total: number;
    hdGoc: number;
    hdPhotoScan: number;
    chuaCoHd: number;
  };
  modalVisible: boolean;
  editingRecord: HopDong | null;
  doiTuongList: DoiTuong[];
}

declare module "./handler/hop-dong.handler" {
  interface HopDongStates extends HopDongPageStates {}
}
