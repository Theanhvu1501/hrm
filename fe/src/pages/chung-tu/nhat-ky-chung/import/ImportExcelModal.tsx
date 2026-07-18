import { useEffect } from "react";
import { Modal, Button } from "antd";
import { ImportHandlerProvider, useImportHandler, useImportState } from "./ImportHandlerContext";
import { UploadStep } from "./components/UploadStep";
import { PreviewTable } from "./components/PreviewTable";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

function ImportExcelModalInner({ open, onClose, onImported }: Props) {
  const handler = useImportHandler();
  const [hasErrors] = useImportState("hasErrors", false);
  const [parsed] = useImportState("parsed", false);
  const [submitting] = useImportState("submitting", false);
  const [validItems] = useImportState("validItems", []);

  useEffect(() => {
    if (open) {
      handler.setState("open", true);
      handler.executeEvent("loadMasterData", {});
    }
  }, [open, handler]);

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
      title="Import Nhật ký chung từ Excel"
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
