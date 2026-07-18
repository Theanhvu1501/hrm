import { BaseEvents } from "@/common";
import { NhatKyChung } from "@/types";

export interface SubmitFormEvent extends BaseEvents {
  submitForm: { params: {}; result: void };
  validateForm: { params: {}; result: { valid: boolean; errors: string[] } };
  resetForm: { params: {}; result: void };
}

declare module "../../nhat-ky-chung-form.handler" {
  interface NhatKyChungFormEvents extends SubmitFormEvent {}
}
