import { BaseEvents } from "@/common";
import {
  CreateHolidayDto,
  UpdateHolidayDto,
  Holiday,
} from "@/services/holidayService";

export interface CrudEvent extends BaseEvents {
  openForm: { params: { record?: Holiday }; result: void };
  closeForm: { params: Record<string, never>; result: void };
  createHoliday: { params: CreateHolidayDto; result: void };
  updateHoliday: { params: { id: string; dto: UpdateHolidayDto }; result: void };
  removeHoliday: { params: { id: string }; result: void };
}

declare module "../../ngayLeHandler" {
  interface NgayLeEvents extends CrudEvent {}
}
