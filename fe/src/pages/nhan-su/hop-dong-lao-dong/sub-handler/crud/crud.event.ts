import { BaseEvents } from "@/common";
import {
  CreateLaborContractDto,
  LaborContract,
  UpdateLaborContractDto,
} from "@/services/laborContractService";

export interface CrudEvent extends BaseEvents {
  openForm: { params: { record?: LaborContract }; result: void };
  closeForm: { params: Record<string, never>; result: void };
  createContract: { params: CreateLaborContractDto; result: void };
  updateContract: {
    params: { id: string; dto: UpdateLaborContractDto };
    result: void;
  };
  removeContract: { params: { id: string }; result: void };
  updateContractStatus: {
    params: { id: string; trangThai: string };
    result: void;
  };
}

declare module "../../hopDongLaoDongHandler" {
  interface HopDongLaoDongEvents extends CrudEvent {}
}
