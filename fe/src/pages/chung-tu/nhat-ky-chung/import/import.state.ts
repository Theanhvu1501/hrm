import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { ImportMasterData } from "./lib/validate";
import { RowValidationResult } from "./lib/columns";
import { CreateEntryDto } from "@/services/nhatKyChungService";

export interface ImportStates extends BaseStates {
  open: boolean;
  masterDataLoaded: boolean;
  loadingMasterData: boolean;
  parsing: boolean;
  submitting: boolean;
  fileName: string;
  masterData: ImportMasterData | null;
  results: RowValidationResult[];
  validItems: CreateEntryDto[];
  hasErrors: boolean;
  parsed: boolean; // đã có kết quả xem trước chưa
}
