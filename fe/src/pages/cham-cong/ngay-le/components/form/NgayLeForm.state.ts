import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { Holiday } from "@/services/holidayService";

export interface FormStates extends BaseStates {
  formVisible: boolean;
  editingHoliday: Holiday | null;
  saving: boolean;
}

declare module "../../ngayLeHandler" {
  interface NgayLeStates extends FormStates {}
}
