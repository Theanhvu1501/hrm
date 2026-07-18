import { BaseEvents } from "@/common";

export interface SubmitImportEvent extends BaseEvents {
  submitImport: { params: { onSuccess?: () => void }; result: void };
}

declare module "../../import.handler" {
  interface ImportEvents extends SubmitImportEvent {}
}
