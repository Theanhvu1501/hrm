import { BaseEvents } from "@/common";
import { CreateEmployeeDto, Employee, UpdateEmployeeDto } from "@/services/employeeService";

export interface CrudEvent extends BaseEvents {
  openForm: { params: { record?: Employee }; result: void };
  closeForm: { params: Record<string, never>; result: void };
  createEmployee: { params: CreateEmployeeDto; result: void };
  updateEmployee: { params: { id: string; dto: UpdateEmployeeDto }; result: void };
  removeEmployee: { params: { id: string }; result: void };
  updateEmployeeStatus: { params: { id: string; trangThai: string }; result: void };
}

declare module "../../hoSoNhanVienHandler" {
  interface HoSoNhanVienEvents extends CrudEvent {}
}
