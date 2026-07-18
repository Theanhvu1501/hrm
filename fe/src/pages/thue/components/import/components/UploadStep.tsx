import { Button, Upload, Space, Typography, message } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { BangKeVariant } from "../lib/columns";
import { downloadTemplate } from "../lib/template";

const { Text } = Typography;

interface Props {
  variant: BangKeVariant;
  parsing: boolean;
  fileName: string;
  onFile: (file: File) => void;
}

export function UploadStep({ variant, parsing, fileName, onFile }: Props) {
  const uploadProps: UploadProps = {
    accept: ".xlsx,.xls",
    showUploadList: false,
    beforeUpload: (file) => {
      onFile(file);
      return false; // chặn upload tự động
    },
  };

  const handleDownload = () => {
    downloadTemplate(variant).catch(() => {
      message.error("Không tạo được file mẫu");
    });
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Space>
        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
          Tải file mẫu
        </Button>
        <Upload {...uploadProps}>
          <Button type="primary" icon={<UploadOutlined />} loading={parsing}>
            Chọn file Excel
          </Button>
        </Upload>
        {fileName && <Text type="secondary">{fileName}</Text>}
      </Space>
      <Text type="secondary">
        Mỗi dòng = 1 hóa đơn. Tiền thuế và tổng thanh toán do hệ thống tự tính từ
        giá trị chưa thuế và thuế suất. File còn dòng lỗi (tô đỏ) sẽ không import
        được; dòng tô vàng chỉ là cảnh báo, vẫn import bình thường.
      </Text>
    </Space>
  );
}
