import { BaseEvents } from "@/common";
import dayjs from "dayjs";

export interface FilterDateEvent extends BaseEvents {
  filterByDate: { params: { dates: [dayjs.Dayjs, dayjs.Dayjs] | null }; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends FilterDateEvent {}
}
