import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { ImportMasterData } from "./lib/validate";
import { RowValidationResult } from "./lib/columns";
import { CreatePhieuDto, PhieuService } from "@/services/phieuService";

export interface ImportStates extends BaseStates {
  open: boolean;
  masterDataLoaded: boolean;
  loadingMasterData: boolean;
  parsing: boolean;
  submitting: boolean;
  fileName: string;
  masterData: ImportMasterData | null;
  results: RowValidationResult[];
  validItems: CreatePhieuDto[];
  hasErrors: boolean;
  parsed: boolean; // đã có kết quả xem trước chưa
  service: PhieuService | null;
}
