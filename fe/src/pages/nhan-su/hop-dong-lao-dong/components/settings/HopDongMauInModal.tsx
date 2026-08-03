import { useEffect, useState } from "react";
import { Modal, Button, Input, Tabs, Form, Popconfirm, Tag, Typography, Collapse, Space } from "antd";
import { message } from "antd";
import { apiErrorMessage } from "@/config/api";
import {
  hopDongTemplateService,
  type ThongTinCongTy,
} from "@/services/hopDongTemplateService";
import { HOP_DONG_TOKEN_DOCS } from "../../lib/hopDongTokens";

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Cấu hình mẫu in hợp đồng lao động: (1) mã HTML mẫu — riêng của tenant hoặc
 * mặc định; (2) thông tin công ty (letterhead — tên/địa chỉ/MST/người đại
 * diện) dùng để điền vào phần "NGƯỜI SỬ DỤNG LAO ĐỘNG" của hợp đồng.
 *
 * Không có bản xem trước ghép dữ liệu thật ở đây (khác TemplateModal bên kế
 * toán) — xem trước ĐÚNG dữ liệu thật nằm ở nút "In hợp đồng" trên từng dòng
 * (HopDongPrintModal), vì hợp đồng cần dữ liệu nhân viên thật, không có sẵn
 * "phiếu mẫu" giả lập hợp lý như phiếu thu/chi.
 */
export function HopDongMauInModal({ open, onClose }: Props) {
  const [loadingMauIn, setLoadingMauIn] = useState(false);
  const [savingMauIn, setSavingMauIn] = useState(false);
  const [html, setHtml] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const [congTyForm] = Form.useForm<ThongTinCongTy>();
  const [loadingCongTy, setLoadingCongTy] = useState(false);
  const [savingCongTy, setSavingCongTy] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoadingMauIn(true);
    hopDongTemplateService
      .getMauIn()
      .then((res) => {
        setHtml(res.html);
        setIsCustom(res.isCustom);
      })
      .catch((err) => message.error(apiErrorMessage(err, "Không tải được mẫu in")))
      .finally(() => setLoadingMauIn(false));

    setLoadingCongTy(true);
    hopDongTemplateService
      .getThongTinCongTy()
      .then((res) => congTyForm.setFieldsValue(res))
      .catch((err) => message.error(apiErrorMessage(err, "Không tải được thông tin công ty")))
      .finally(() => setLoadingCongTy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSaveMauIn = async () => {
    setSavingMauIn(true);
    try {
      const res = await hopDongTemplateService.upsertMauIn(html);
      setHtml(res.html);
      setIsCustom(true);
      message.success("Đã lưu mẫu in");
    } catch (err) {
      message.error(apiErrorMessage(err, "Lưu mẫu in thất bại"));
    } finally {
      setSavingMauIn(false);
    }
  };

  const handleResetMauIn = async () => {
    setSavingMauIn(true);
    try {
      await hopDongTemplateService.removeMauIn();
      const res = await hopDongTemplateService.getMauIn();
      setHtml(res.html);
      setIsCustom(res.isCustom);
      message.success("Đã khôi phục mẫu mặc định");
    } catch (err) {
      message.error(apiErrorMessage(err, "Khôi phục mặc định thất bại"));
    } finally {
      setSavingMauIn(false);
    }
  };

  const handleSaveCongTy = async () => {
    setSavingCongTy(true);
    try {
      const values = await congTyForm.validateFields();
      const res = await hopDongTemplateService.upsertThongTinCongTy(values);
      congTyForm.setFieldsValue(res);
      message.success("Đã lưu thông tin công ty");
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return; // lỗi validate form, đã hiện tại field
      message.error(apiErrorMessage(err, "Lưu thông tin công ty thất bại"));
    } finally {
      setSavingCongTy(false);
    }
  };

  return (
    <Modal
      title="Mẫu in hợp đồng lao động"
      open={open}
      onCancel={onClose}
      width={900}
      destroyOnClose
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      <Tabs
        items={[
          {
            key: "mau-in",
            label: "Mẫu in (HTML)",
            children: (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Text type="secondary">
                    Dùng token dạng <code>{"{{hoTenNLD}}"}</code>. Sửa trực tiếp
                    HTML bên dưới, hoặc bấm "Khôi phục mặc định" để quay về mẫu
                    gốc theo BLLĐ 45/2019/QH14.
                  </Text>
                  <Tag color={isCustom ? "blue" : "default"}>
                    {isCustom ? "Mẫu riêng" : "Mẫu mặc định"}
                  </Tag>
                </div>
                <Input.TextArea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  autoSize={{ minRows: 16, maxRows: 20 }}
                  spellCheck={false}
                  disabled={loadingMauIn}
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
                <Collapse
                  ghost
                  size="small"
                  items={[
                    {
                      key: "token",
                      label: "Token hỗ trợ (lưu sẽ bị từ chối nếu dùng token ngoài danh sách này)",
                      children: (
                        <Space direction="vertical" size={2}>
                          {HOP_DONG_TOKEN_DOCS.map((t) => (
                            <Text key={t.token} className="text-xs">
                              <code>{t.token}</code> — {t.moTa}
                            </Text>
                          ))}
                        </Space>
                      ),
                    },
                  ]}
                />
                <div className="flex justify-end gap-2">
                  <Popconfirm
                    title="Khôi phục mẫu mặc định?"
                    description="Mẫu riêng đang lưu sẽ bị xoá."
                    onConfirm={handleResetMauIn}
                    okText="Khôi phục"
                    cancelText="Huỷ"
                    disabled={!isCustom}
                  >
                    <Button danger loading={savingMauIn} disabled={!isCustom}>
                      Khôi phục mặc định
                    </Button>
                  </Popconfirm>
                  <Button type="primary" loading={savingMauIn} onClick={handleSaveMauIn}>
                    Lưu mẫu
                  </Button>
                </div>
              </div>
            ),
          },
          {
            key: "cong-ty",
            label: "Thông tin công ty",
            children: (
              <Form form={congTyForm} layout="vertical" disabled={loadingCongTy}>
                <Text type="secondary" className="block mb-3">
                  Điền vào phần "NGƯỜI SỬ DỤNG LAO ĐỘNG" của hợp đồng. Để trống
                  trường nào thì bản in hiện khoảng trống ở đó, không tự bịa.
                </Text>
                <Form.Item name="tenCongTy" label="Tên công ty">
                  <Input placeholder="CÔNG TY CỔ PHẦN ..." />
                </Form.Item>
                <Form.Item name="diaChiCongTy" label="Địa chỉ">
                  <Input placeholder="Số nhà, đường, phường/xã, tỉnh/thành" />
                </Form.Item>
                <Form.Item name="maSoThue" label="Mã số thuế">
                  <Input placeholder="0110595215" />
                </Form.Item>
                <Form.Item name="nguoiDaiDien" label="Người đại diện">
                  <Input placeholder="Họ và tên người đại diện pháp luật" />
                </Form.Item>
                <Form.Item name="chucVuNguoiDaiDien" label="Chức vụ người đại diện">
                  <Input placeholder="Giám đốc" />
                </Form.Item>
                <Form.Item
                  name="thanhPhoKy"
                  label="Thành phố ký hợp đồng"
                  extra='Dòng "..., ngày ... tháng ... năm ..." đầu văn bản. Để trống → bản in để trống, KHÔNG mặc định "Hà Nội".'
                >
                  <Input placeholder="Hà Nội" />
                </Form.Item>
                <Form.Item
                  name="maHopDongMau"
                  label="Hậu tố số hợp đồng"
                  extra='Nối vào sau số hợp đồng, vd "/HĐLĐ-MC.1" → "Số: HD0001/HĐLĐ-MC.1". Để trống nếu công ty không dùng ký hiệu riêng.'
                >
                  <Input placeholder="/HĐLĐ-MC.1" />
                </Form.Item>
                <div className="flex justify-end">
                  <Button type="primary" loading={savingCongTy} onClick={handleSaveCongTy}>
                    Lưu thông tin công ty
                  </Button>
                </div>
              </Form>
            ),
          },
        ]}
      />
    </Modal>
  );
}
