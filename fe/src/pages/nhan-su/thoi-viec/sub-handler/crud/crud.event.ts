import { BaseEvents } from "@/common";
import {
  CreateResignationDto,
  Resignation,
  UpdateResignationDto,
} from "@/services/resignationService";

export interface CrudEvent extends BaseEvents {
  openForm: { params: { record?: Resignation }; result: void };
  closeForm: { params: Record<string, never>; result: void };
  createResignation: { params: CreateResignationDto; result: void };
  updateResignation: {
    params: { id: string; dto: UpdateResignationDto };
    result: void;
  };
  removeResignation: { params: { id: string }; result: void };
  updateResignationStatus: {
    params: { id: string; trangThai: string };
    result: void;
  };
}

declare module "../../thoiViecHandler" {
  interface ThoiViecEvents extends CrudEvent {}
}
