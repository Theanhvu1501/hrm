import { BaseEvents } from "@/common";
import { CreateEntryDto } from "@/services/nhatKyChungService";

export interface CreateEvent extends BaseEvents {
  openCreateModal: { params: Record<string, never>; result: void };
  closeFormModal: { params: Record<string, never>; result: void };
  createEntry: { params: CreateEntryDto; result: void };
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends CreateEvent {}
}
