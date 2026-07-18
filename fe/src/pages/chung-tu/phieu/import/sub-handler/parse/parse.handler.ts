import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import * as XLSX from "xlsx";
import { message } from "antd";
import "./parse.event";
import { ImportEvents } from "../../import.handler";
import { ImportStates } from "../../import.state";
import { aoaToRawRows } from "../../lib/parseRows";
import { validateAndBuild, ImportMasterData } from "../../lib/validate";

@RegisterHandler("phieu-import")
export class ParseHandler extends CSubHanlder<ImportEvents, ImportStates> {
  @HandlerDecorator("parseFile")
  async parseFile(params: { file: File }): Promise<void> {
    const md = this.getState("masterData") as ImportMasterData | null;
    if (!md) {
      message.error("Chưa tải xong danh mục, vui lòng thử lại");
      return;
    }
    this.setState("parsing", true);
    try {
      const buffer = await params.file.arrayBuffer();
      // Không dùng cellDates: ô ngày về dạng serial để normalizeDate đọc thẳng (xem normalize.ts)
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        raw: true,
        defval: "",
      });

      const rows = aoaToRawRows(aoa as unknown[][]);
      if (rows.length === 0) {
        message.warning("File không có dòng dữ liệu");
      }
      const { results, validItems, hasErrors } = validateAndBuild(rows, md);

      this.setState("fileName", params.file.name);
      this.setState("results", results);
      this.setState("validItems", validItems);
      this.setState("hasErrors", hasErrors);
      this.setState("parsed", true);
    } catch (e) {
      console.error("Lỗi đọc file Excel:", e);
      message.error("Không đọc được file Excel. Kiểm tra lại định dạng.");
    } finally {
      this.setState("parsing", false);
    }
  }

  @HandlerDecorator("resetImport")
  async resetImport(): Promise<void> {
    this.setState("fileName", "");
    this.setState("results", []);
    this.setState("validItems", []);
    this.setState("hasErrors", false);
    this.setState("parsed", false);
  }
}
