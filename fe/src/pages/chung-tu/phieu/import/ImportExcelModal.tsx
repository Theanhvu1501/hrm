import { useEffect } from "react";
import { Modal, Button } from "antd";
import { ImportHandlerProvider, useImportHandler, useImportState } from "./ImportHandlerContext";
import { UploadStep } from "./components/UploadStep";
import { PreviewTable } from "./components/PreviewTable";
import { PhieuService } from "@/services/phieuService";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
  service: PhieuService;
}

function ImportExcelModalInner({ open, onClose, onImported, service }: Props) {
  const handler = useImportHandler();
  const [hasErrors] = useImportState("hasErrors", false);
  const [parsed] = useImportState("parsed", false);
  const [submitting] = useImportState("submitting", false);
  const [validItems] = useImportState("validItems", []);

  useEffect(() => {
    if (open) {
      handler.setState("open", true);
      handler.setState("service", service);
      handler.executeEvent("loadMasterData", {});
    }
  }, [open, handler, service]);

  const handleClose = () => {
    handler.executeEvent("resetImport", {});
    onClose();
  };

  const handleImport = () => {
    handler.executeEvent("submitImport", {
      onSuccess: () => {
        onImported?.();
        onClose();
      },
    });
  };

  const canImport = parsed && !hasErrors && (validItems?.length ?? 0) > 0;

  return (
    <Modal
      title="Import Phiếu thu/chi từ Excel"
      open={open}
      onCancel={handleClose}
      width={840}
      footer={[
        <Button key="cancel" onClick={handleClose}>Đóng</Button>,
        <Button
          key="import"
          type="primary"
          disabled={!canImport}
          loading={submitting}
          onClick={handleImport}
        >
          {`Import ${validItems?.length ?? 0} chứng từ`}
        </Button>,
      ]}
    >
      <UploadStep />
      <PreviewTable />
    </Modal>
  );
}

export function ImportExcelModal(props: Props) {
  return (
    <ImportHandlerProvider>
      <ImportExcelModalInner {...props} />
    </ImportHandlerProvider>
  );
}
