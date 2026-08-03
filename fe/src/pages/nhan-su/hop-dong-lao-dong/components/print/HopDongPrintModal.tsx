import { useEffect, useState } from "react";
import { Modal, Button, Alert, Spin } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { apiErrorMessage } from "@/config/api";
import { hopDongTemplateService } from "@/services/hopDongTemplateService";
import { printHopDong } from "../../lib/printHopDong";

interface Props {
  open: boolean;
  contractId?: string;
  /** Hiện trong tiêu đề iframe khi in — dùng số hợp đồng cho dễ nhận trong danh sách "In" của trình duyệt. */
  contractLabel?: string;
  onClose: () => void;
}

/**
 * Xem trước + in 1 hợp đồng lao động. HTML đã ghép đủ dữ liệu (hợp đồng +
 * nhân viên + thông tin công ty) do BE trả về (`GET /config/hop-dong/:id/in`)
 * — modal này chỉ hiển thị và gọi lệnh in, không tự ghép token.
 *
 * `canhBao` (khoảng trống do thiếu dữ liệu, KHÔNG phải chỗ trống cố ý như
 * "ngày cấp CCCD") hiện thành Alert cảnh báo TRƯỚC khi cho in, để HR biết mà
 * bổ sung hồ sơ hoặc điền tay, không âm thầm in thiếu.
 */
export function HopDongPrintModal({ open, contractId, contractLabel, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState("");
  const [canhBao, setCanhBao] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !contractId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    hopDongTemplateService
      .render(contractId)
      .then((result) => {
        if (cancelled) return;
        setHtml(result.html);
        setCanhBao(result.canhBao);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(apiErrorMessage(err, "Không tải được nội dung hợp đồng để in"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, contractId]);

  const handlePrint = () => {
    printHopDong(html, contractLabel);
  };

  return (
    <Modal
      title="In hợp đồng lao động"
      open={open}
      onCancel={onClose}
      width={840}
      destroyOnClose
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          disabled={loading || !!error || !html}
          onClick={handlePrint}
        >
          In
        </Button>,
      ]}
    >
      {loading && (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      )}

      {!loading && error && <Alert type="error" showIcon message={error} />}

      {!loading && !error && (
        <div className="space-y-3">
          {canhBao.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message="Bản in còn thiếu dữ liệu"
              description={
                <ul className="list-disc pl-4 m-0">
                  {canhBao.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              }
            />
          )}
          <iframe
            title="Xem trước hợp đồng"
            srcDoc={html}
            className="w-full rounded-md border bg-white"
            style={{ height: "60vh" }}
            // Khung xem trước chỉ để ĐỌC — không cần parent script gì truy
            // cập lại nội dung của nó, nên sandbox rỗng (chặt nhất): không
            // allow-scripts, không allow-same-origin. Đây là lớp phòng thủ
            // Ở TẦNG TRÌNH DUYỆT, độc lập với sanitize-html ở BE (review
            // Critical 1 — "add sandbox to the preview iframe").
            sandbox=""
          />
        </div>
      )}
    </Modal>
  );
}
