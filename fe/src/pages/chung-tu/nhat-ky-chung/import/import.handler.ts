import { BaseEvents, CHanlder } from "@/common";
import "./sub-handler";
import { ImportStates } from "./import.state";

export interface ImportEvents extends BaseEvents {}

export class ImportHandler extends CHanlder<ImportEvents, ImportStates> {
  constructor() {
    super("nhat-ky-chung-import");
  }
}
