import { Button, Upload, Space, Typography, message } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useImportHandler, useImportState } from "../ImportHandlerContext";
import { downloadTemplate } from "../lib/template";
import { ImportMasterData } from "../lib/validate";

const { Text } = Typography;

export function UploadStep() {
  const handler = useImportHandler();
  const [parsing] = useImportState("parsing", false);
  const [loadingMasterData] = useImportState("loadingMasterData", false);
  const [masterDataLoaded] = useImportState("masterDataLoaded", false);
  const [masterData] = useImportState("masterData", null);
  const [fileName] = useImportState("fileName", "");

  const uploadProps: UploadProps = {
    accept: ".xlsx,.xls",
    showUploadList: false,
    beforeUpload: (file) => {
      handler.executeEvent("parseFile", { file });
      return false; // chặn upload tự động
    },
  };

  const handleDownload = () => {
    if (!masterData) return;
    downloadTemplate(masterData as ImportMasterData).catch(() => {
      message.error("Không tạo được file mẫu");
    });
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Space>
        <Button
          icon={<DownloadOutlined />}
          loading={loadingMasterData}
          disabled={!masterDataLoaded || !masterData}
          onClick={handleDownload}
        >
          Tải file mẫu
        </Button>
        <Upload {...uploadProps}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={parsing || loadingMasterData}
            disabled={loadingMasterData}
          >
            Chọn file Excel
          </Button>
        </Upload>
        {fileName && <Text type="secondary">{fileName}</Text>}
      </Space>
      <Text type="secondary">
        Mỗi dòng = 1 chứng từ. Cột 1–6 bắt buộc. Chọn giá trị từ danh sách thả xuống trong từng cột danh mục (có thể gõ tay mã nếu muốn). File còn lỗi sẽ không import được.
      </Text>
    </Space>
  );
}
