import { BaseEvents } from "@/common";
import {
  CreateEmploymentHistoryDto,
  EmploymentHistory,
  UpdateEmploymentHistoryDto,
} from "@/services/employmentHistoryService";

export interface CrudEvent extends BaseEvents {
  openForm: { params: { record?: EmploymentHistory }; result: void };
  closeForm: { params: Record<string, never>; result: void };
  createHistory: { params: CreateEmploymentHistoryDto; result: void };
  updateHistory: {
    params: { id: string; dto: UpdateEmploymentHistoryDto };
    result: void;
  };
  removeHistory: { params: { id: string }; result: void };
}

declare module "../../quaTrinhCongTacHandler" {
  interface QuaTrinhCongTacEvents extends CrudEvent {}
}
