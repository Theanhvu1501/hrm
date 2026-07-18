import { BaseEvents } from "@/common";
import {
  AttendanceRequest,
  AttendanceRequestStatus,
  CreateAttendanceRequestDto,
  UpdateAttendanceRequestDto,
} from "@/services/attendanceRequestService";

export interface CrudEvent extends BaseEvents {
  openForm: { params: { record?: AttendanceRequest }; result: void };
  closeForm: { params: Record<string, never>; result: void };
  createRequest: { params: CreateAttendanceRequestDto; result: void };
  updateRequest: {
    params: { id: string; dto: UpdateAttendanceRequestDto };
    result: void;
  };
  removeRequest: { params: { id: string }; result: void };
  updateRequestStatus: {
    params: {
      id: string;
      trangThai: AttendanceRequestStatus;
      nguoiDuyet?: string;
    };
    result: void;
  };
}

declare module "../../donChamCongHandler" {
  interface DonChamCongEvents extends CrudEvent {}
}
