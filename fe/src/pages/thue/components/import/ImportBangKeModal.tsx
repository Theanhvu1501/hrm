import { useState } from "react";
import { Modal, Button, message } from "antd";
import * as XLSX from "xlsx";
import type { DuplicateKey } from "@/services/taxService";
import { UploadStep } from "./components/UploadStep";
import { PreviewTable } from "./components/PreviewTable";
import {
  BangKeImportItem,
  BangKeVariant,
  RawImportRow,
  RowValidationResult,
  buildColumns,
} from "./lib/columns";
import { aoaToRawRows, missingRequiredColumns } from "./lib/parseRows";
import { validateRows } from "./lib/validate";
import { applyDuplicateWarnings } from "./lib/duplicates";

const LARGE_FILE_THRESHOLD = 1000;

/** Chỉ phần API mà modal cần — bangKeMuaVaoService / bangKeBanRaService đều thỏa. */
export interface ImportService {
  importMany: (items: unknown[]) => Promise<number>;
  checkDuplicates: (keys: DuplicateKey[]) => Promise<string[]>;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  variant: BangKeVariant;
  service: ImportService;
}

export function ImportBangKeModal({
  open,
  onClose,
  onImported,
  variant,
  service,
}: Props) {
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<RawImportRow[]>([]);
  const [results, setResults] = useState<RowValidationResult[]>([]);
  const [validItems, setValidItems] = useState<BangKeImportItem[]>([]);
  const [hasErrors, setHasErrors] = useState(false);

  const reset = () => {
    setFileName("");
    setRows([]);
    setResults([]);
    setValidItems([]);
    setHasErrors(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      // Không dùng cellDates: ô ngày về dạng serial để normalizeDate đọc thẳng (xem normalize.ts)
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        raw: true,
        defval: "",
      }) as unknown[][];

      const columns = buildColumns(variant);
      // Khớp cột theo TÊN tiêu đề → file mẫu cũ (chưa có cột Tiền thuế / Tổng thanh toán) vẫn dùng được.
      const missing = missingRequiredColumns(aoa, columns);
      if (missing.length > 0) {
        message.error(
          `File thiếu cột bắt buộc: ${missing.join(", ")}. Vui lòng tải lại file mẫu.`,
        );
        return;
      }

      const parsedRows = aoaToRawRows(aoa, columns);
      if (parsedRows.length === 0) {
        message.warning("File không có dòng dữ liệu");
        reset();
        return;
      }
      if (parsedRows.length > LARGE_FILE_THRESHOLD) {
        message.warning(
          `File có ${parsedRows.length} dòng, quá trình import có thể mất một lúc`,
        );
      }

      const { results: validated, hasErrors: hasErr } = validateRows(
        parsedRows,
        variant,
      );

      // Đối chiếu hóa đơn đã có trên hệ thống — lỗi mạng chỉ mất cảnh báo, không chặn import
      let existingKeys: string[] = [];
      const keys = validated
        .filter((r) => r.key && r.errors.length === 0)
        .map((r) => ({
          soHoaDon: r.item?.soHoaDon ?? "",
          kyHieuHoaDon: r.item?.kyHieuHoaDon,
          mst: variant === "mua" ? r.item?.mstNguoiBan : r.item?.mstNguoiMua,
        }));
      if (keys.length > 0) {
        try {
          existingKeys = await service.checkDuplicates(keys);
        } catch {
          message.warning("Không kiểm tra được hóa đơn trùng, vẫn có thể import");
        }
      }

      const withWarnings = applyDuplicateWarnings(validated, existingKeys);

      setFileName(file.name);
      setRows(parsedRows);
      setResults(withWarnings);
      setValidItems(
        withWarnings
          .map((r) => r.item)
          .filter((i): i is BangKeImportItem => i !== null),
      );
      setHasErrors(hasErr);
    } catch (e) {
      console.error("Lỗi đọc file Excel:", e);
      message.error("Không đọc được file Excel. Kiểm tra lại định dạng.");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (hasErrors) {
      message.error("Còn dòng lỗi, vui lòng sửa file trước khi import");
      return;
    }
    if (validItems.length === 0) {
      message.warning("Không có dòng hợp lệ để import");
      return;
    }
    setSubmitting(true);
    try {
      const created = await service.importMany(validItems);
      message.success(`Đã import ${created} hóa đơn`);
      reset();
      onImported();
      onClose();
    } catch (e) {
      const err = e as { message?: string };
      message.error(err.message || "Import thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const canImport = !hasErrors && validItems.length > 0;

  return (
    <Modal
      title={`Import ${variant === "mua" ? "bảng kê mua vào" : "bảng kê bán ra"} từ Excel`}
      open={open}
      onCancel={handleClose}
      width={1000}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Đóng
        </Button>,
        <Button
          key="import"
          type="primary"
          disabled={!canImport}
          loading={submitting}
          onClick={handleImport}
        >
          {`Import ${validItems.length} hóa đơn`}
        </Button>,
      ]}
    >
      <UploadStep
        variant={variant}
        parsing={parsing}
        fileName={fileName}
        onFile={handleFile}
      />
      <PreviewTable variant={variant} rows={rows} results={results} />
    </Modal>
  );
}
