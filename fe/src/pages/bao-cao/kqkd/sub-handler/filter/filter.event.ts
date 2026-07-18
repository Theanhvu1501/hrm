import { BaseEvents } from "@/common";
import { KqkdPeriodType } from "@/services/kqkdService";

export interface FilterEvent extends BaseEvents {
  onFilterChange: {
    params: {
      periodType?: KqkdPeriodType;
      selectedDate?: Date;
      dateRange?: { startDate: string; endDate: string };
    };
    result: void;
  };
}

declare module "../../kqkdHandler" {
  interface KqkdEvents extends FilterEvent {}
}
