import { BaseEvents } from "@/common";
import {
  CreateWorkShiftDto,
  UpdateWorkShiftDto,
  WorkShift,
} from "@/services/workShiftService";

export interface CrudEvent extends BaseEvents {
  openForm: { params: { record?: WorkShift }; result: void };
  closeForm: { params: Record<string, never>; result: void };
  createShift: { params: CreateWorkShiftDto; result: void };
  updateShift: {
    params: { id: string; dto: UpdateWorkShiftDto };
    result: void;
  };
  removeShift: { params: { id: string }; result: void };
}

declare module "../../caLamViecHandler" {
  interface CaLamViecEvents extends CrudEvent {}
}
