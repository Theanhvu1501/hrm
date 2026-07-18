import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Input, Upload, Typography, Space, Collapse } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { toast } from "sonner";
import { usePhieuState, usePhieuConfig } from "../../PhieuHandlerContext";
import { useAuth } from "@/contexts/AuthContext";
import { phieuTemplateService } from "@/services/phieuTemplateService";
import { getDefaultTemplate, PHIEU_PLACEHOLDERS } from "../../lib/printTemplates";
import { buildPhieuHtml } from "../../lib/printPhieu";
import { ChungTu, LoaiChungTu } from "@/types";

const { Text } = Typography;

function buildSample(loai: LoaiChungTu): ChungTu {
  return {
    id: "preview",
    soPhieu: loai === "PHIEU_CHI" ? "PC0001" : "PT0001",
    loai,
    ngay: "2026-06-20T00:00:00.000Z",
    soTien: 1234567,
    noiDung: loai === "PHIEU_CHI" ? "Chi mua văn phòng phẩm" : "Thu tiền dịch vụ",
    nguoiGiaoDich: "Nguyễn Văn A",
    diaChi: "123 Đường ABC, Hà Nội",
    ghiChu: "02",
    danhMuc: {
      taiKhoanNo: { ma: "111", ten: "Tiền mặt", loai: "", nhom: "" },
      taiKhoanCo: { ma: "511", ten: "Doanh thu", loai: "", nhom: "" },
    },
  } as unknown as ChungTu;
}

export function TemplateModal() {
  const config = usePhieuConfig();
  const { currentTenant } = useAuth();
  const [open, setOpen] = usePhieuState("templateModalOpen", false);
  const [printTemplate, setPrintTemplate] = usePhieuState("printTemplate", null);

  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setHtml(printTemplate || getDefaultTemplate(config.loai));
  }, [open, printTemplate, config.loai]);

  const previewHtml = useMemo(
    () =>
      buildPhieuHtml(buildSample(config.loai), html, {
        tenCongTy: currentTenant?.tenantName ?? "",
        diaChiCongTy: "",
      }),
    [html, config.loai, currentTenant]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await phieuTemplateService.upsert(config.loai, html);
      setPrintTemplate(html);
      toast.success("Đã lưu mẫu in");
      setOpen(false);
    } catch {
      toast.error("Lưu mẫu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await phieuTemplateService.remove(config.loai);
      setPrintTemplate(null);
      setHtml(getDefaultTemplate(config.loai));
      toast.success("Đã khôi phục mẫu mặc định");
    } catch {
      toast.error("Khôi phục thất bại");
    } finally {
      setSaving(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: ".html,.htm,text/html",
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = () => setHtml(String(reader.result ?? ""));
      reader.readAsText(file);
      return false;
    },
  };

  return (
    <Modal
      title={`Mẫu in — ${config.title}`}
      open={!!open}
      onCancel={() => setOpen(false)}
      width={1000}
      footer={[
        <Button key="reset" danger onClick={handleReset} loading={saving}>
          Khôi phục mặc định
        </Button>,
        <Button key="close" onClick={() => setOpen(false)}>
          Đóng
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} loading={saving}>
          Lưu mẫu
        </Button>,
      ]}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Text strong>Mã HTML</Text>
            <Upload {...uploadProps}>
              <Button size="small" icon={<UploadOutlined />}>
                Tải file .html
              </Button>
            </Upload>
          </div>
          <Input.TextArea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            autoSize={{ minRows: 14, maxRows: 14 }}
            spellCheck={false}
            style={{ fontFamily: "monospace", fontSize: 12 }}
          />
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: "ph",
                label: "Placeholder hỗ trợ",
                children: (
                  <Space direction="vertical" size={2}>
                    {PHIEU_PLACEHOLDERS.map((p) => (
                      <Text key={p.token} className="text-xs">
                        <code>{p.token}</code> — {p.moTa}
                      </Text>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Text strong>Xem trước</Text>
          <iframe
            title="preview"
            className="w-full rounded-md border bg-white"
            style={{ height: 420 }}
            srcDoc={previewHtml}
          />
        </div>
      </div>
    </Modal>
  );
}
