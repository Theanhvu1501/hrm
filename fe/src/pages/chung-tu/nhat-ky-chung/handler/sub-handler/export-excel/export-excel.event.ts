import { BaseEvents } from "@/common";

export interface ExportExcelEvent extends BaseEvents {
  exportExcel: { params: Record<string, never>; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends ExportExcelEvent {}
}
