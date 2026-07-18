import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { ChuDauTu } from "@/types";

export interface ChuDauTuPageStates extends BaseStates {
  data: ChuDauTu[];
  loading: boolean;
  searchText: string;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  stats: { total: number };
  modalVisible: boolean;
  editingRecord: ChuDauTu | null;
}

declare module "./handler/chu-dau-tu.handler" {
  interface ChuDauTuStates extends ChuDauTuPageStates {}
}
