import { BaseEvents } from "@/common";
import {
  AttendanceLocation,
  CreateAttendanceLocationDto,
  UpdateAttendanceLocationDto,
} from "@/services/attendanceLocationService";

export interface CrudEvent extends BaseEvents {
  openForm: { params: { record?: AttendanceLocation }; result: void };
  closeForm: { params: Record<string, never>; result: void };
  createLocation: { params: CreateAttendanceLocationDto; result: void };
  updateLocation: {
    params: { id: string; dto: UpdateAttendanceLocationDto };
    result: void;
  };
  removeLocation: { params: { id: string }; result: void };
}

declare module "../../diaDiemChamCongHandler" {
  interface DiaDiemChamCongEvents extends CrudEvent {}
}
