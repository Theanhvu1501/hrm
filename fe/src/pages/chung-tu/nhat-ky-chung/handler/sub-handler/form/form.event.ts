import { BaseEvents } from "@/common";
import { FormValues, SubmitData, InitFormResult } from "./form.types";

export interface FormEvents extends BaseEvents {
  buildSubmitData: { params: { values: FormValues }; result: SubmitData };
  submitForm: { params: { values: FormValues }; result: void };
  initFormValues: { params: Record<string, never>; result: InitFormResult };
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends FormEvents {}
}
