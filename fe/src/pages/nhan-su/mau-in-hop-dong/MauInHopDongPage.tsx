import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  Popconfirm,
  Space,
  Spin,
  Tabs,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { apiErrorMessage } from "@/config/api";
import { usePagePermission } from "@/hooks/usePagePermission";
import {
  hopDongTemplateService,
  type MauInHopDong,
  type ThongTinCongTy,
} from "@/services/hopDongTemplateService";
import { HOP_DONG_TOKEN_DOCS } from "../hop-dong-lao-dong/lib/hopDongTokens";

const { Text, Title } = Typography;

/**
 * Quản lý mẫu in hợp đồng lao động — nhiều mẫu, mỗi mẫu một tên (Thử việc,
 * Chính thức, Dịch vụ…). Khi in, người dùng chọn mẫu; mẫu KHÔNG gắn cứng vào
 * `loaiHopDong` vì cùng một hợp đồng có thể cần in ra nhiều dạng khác nhau.
 *
 * Trước đây đây là một modal nằm trong màn Hợp đồng và chỉ giữ được ĐÚNG MỘT
 * mẫu cho cả tenant. Tab "Thông tin công ty" chuyển sang đây cùng lúc để mọi
 * thứ liên quan tới bản in nằm một chỗ, thay vì nửa ở trang này nửa ở modal
 * kia.
 *
 * Quyền dùng lại nguyên bộ `/nhan-su/hop-dong-lao-dong:*` của CRUD hợp đồng —
 * không khai module quyền mới nên không phải cấp quyền lại lúc deploy.
 */
export function MauInHopDongPage() {
  const { canEdit } = usePagePermission("/nhan-su/hop-dong-lao-dong");

  const [dsMau, setDsMau] = useState<MauInHopDong[]>([]);
  const [dangChon, setDangChon] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ten, setTen] = useState("");
  const [html, setHtml] = useState("");

  const chonMau = useCallback((mau: MauInHopDong) => {
    setDangChon(mau.id);
    setTen(mau.ten);
    setHtml(mau.html);
  }, []);

  const taiDanhSach = useCallback(
    async (giuId?: string) => {
      setLoading(true);
      try {
        const ds = await hopDongTemplateService.dsMauIn();
        setDsMau(ds);
        // Giữ nguyên mẫu đang mở sau khi lưu; mất nó thì nhảy về mẫu đầu —
        // để trống khung soạn thảo ngay sau một thao tác thành công đọc như
        // vừa mất dữ liệu.
        const mau = ds.find((m) => m.id === giuId) ?? ds[0];
        if (mau) chonMau(mau);
        else {
          setDangChon(null);
          setTen("");
          setHtml("");
        }
      } catch (err) {
        message.error(apiErrorMessage(err, "Không tải được danh sách mẫu in"));
      } finally {
        setLoading(false);
      }
    },
    [chonMau],
  );

  useEffect(() => {
    void taiDanhSach();
  }, [taiDanhSach]);

  const themMau = async () => {
    setSaving(true);
    try {
      // Mẫu mới nhân bản nội dung mẫu đang mở: soạn hợp đồng từ trang trắng
      // gần như không ai làm, cái người ta cần là sửa vài Điều của mẫu sẵn.
      const mau = await hopDongTemplateService.themMauIn(
        "Mẫu mới",
        html || "<p>Nội dung mẫu</p>",
      );
      message.success("Đã thêm mẫu — đặt lại tên rồi bấm Lưu");
      await taiDanhSach(mau.id);
    } catch (err) {
      message.error(apiErrorMessage(err, "Thêm mẫu thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const luuMau = async () => {
    if (!dangChon) return;
    setSaving(true);
    try {
      await hopDongTemplateService.suaMauIn(dangChon, { ten, html });
      message.success("Đã lưu mẫu in");
      await taiDanhSach(dangChon);
    } catch (err) {
      // Thông báo của BE (token gõ sai, tên rỗng) phải hiện nguyên văn —
      // "Lưu thất bại" chung chung không cho biết sai token nào.
      message.error(apiErrorMessage(err, "Lưu mẫu in thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const xoaMau = async (id: string) => {
    setSaving(true);
    try {
      await hopDongTemplateService.xoaMauIn(id);
      message.success("Đã xoá mẫu in");
      await taiDanhSach();
    } catch (err) {
      message.error(apiErrorMessage(err, "Xoá mẫu in thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Title level={4} className="!mb-0">
          Mẫu in hợp đồng
        </Title>
        <Text type="secondary">
          Mỗi loại hợp đồng một mẫu riêng — khi in bạn chọn mẫu cần dùng
        </Text>
      </div>

      <Tabs
        items={[
          {
            key: "mau-in",
            label: "Mẫu in",
            children: (
              <div className="flex flex-col gap-3 lg:flex-row">
                <Card
                  size="small"
                  className="lg:w-72 lg:shrink-0"
                  title="Danh sách mẫu"
                  extra={
                    canEdit && (
                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={themMau}
                        loading={saving}
                      >
                        Thêm
                      </Button>
                    )
                  }
                >
                  <Spin spinning={loading}>
                    {dsMau.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có mẫu nào"
                      />
                    ) : (
                      <List
                        size="small"
                        dataSource={dsMau}
                        renderItem={(m) => (
                          <List.Item
                            onClick={() => chonMau(m)}
                            className="cursor-pointer"
                            style={
                              m.id === dangChon
                                ? { background: "var(--ant-color-primary-bg)" }
                                : undefined
                            }
                            actions={
                              canEdit
                                ? [
                                    <Popconfirm
                                      key="xoa"
                                      title="Xoá mẫu này?"
                                      description="Hợp đồng đã in ra không bị ảnh hưởng."
                                      okText="Xoá"
                                      cancelText="Huỷ"
                                      onConfirm={() => xoaMau(m.id)}
                                    >
                                      <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                      />
                                    </Popconfirm>,
                                  ]
                                : undefined
                            }
                          >
                            {m.ten}
                          </List.Item>
                        )}
                      />
                    )}
                  </Spin>
                </Card>

                <Card size="small" className="flex-1" title="Nội dung mẫu">
                  {dangChon ? (
                    <div className="space-y-2">
                      <Input
                        value={ten}
                        onChange={(e) => setTen(e.target.value)}
                        placeholder="Tên mẫu, vd: Hợp đồng thử việc"
                        disabled={!canEdit}
                      />
                      <Text type="secondary" className="block text-xs">
                        Dùng token dạng <code>{"{{hoTenNLD}}"}</code>. Để an
                        toàn, mẫu KHÔNG hỗ trợ thẻ <code>{"<a>"}</code>/
                        <code>{"<img>"}</code> và không tự chèn{" "}
                        <code>{"<style>"}</code> — CSS khổ giấy do hệ thống
                        quản lý. Muốn xuất Excel ra bảng thì soạn bằng{" "}
                        <code>{"<table>"}</code>.
                      </Text>
                      <Input.TextArea
                        value={html}
                        onChange={(e) => setHtml(e.target.value)}
                        autoSize={{ minRows: 18, maxRows: 26 }}
                        spellCheck={false}
                        disabled={!canEdit}
                        style={{ fontFamily: "monospace", fontSize: 12 }}
                      />
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {HOP_DONG_TOKEN_DOCS.map((t) => (
                          <Text key={t.token} className="text-xs">
                            <code>{t.token}</code>
                          </Text>
                        ))}
                      </div>
                      {canEdit && (
                        <div className="flex justify-end">
                          <Button type="primary" loading={saving} onClick={luuMau}>
                            Lưu mẫu
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Chọn một mẫu ở danh sách bên trái"
                    />
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: "cong-ty",
            label: "Thông tin công ty",
            children: <ThongTinCongTyForm canEdit={canEdit} />,
          },
        ]}
      />
    </div>
  );
}

/**
 * Letterhead công ty — điền vào phần "NGƯỜI SỬ DỤNG LAO ĐỘNG" của mọi mẫu.
 * Chuyển nguyên từ `HopDongMauInModal` cũ sang, không đổi trường nào.
 */
function ThongTinCongTyForm({ canEdit }: { canEdit: boolean }) {
  const [form] = Form.useForm<ThongTinCongTy>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    hopDongTemplateService
      .getThongTinCongTy()
      .then((res) => form.setFieldsValue(res))
      .catch((err) =>
        message.error(apiErrorMessage(err, "Không tải được thông tin công ty")),
      )
      .finally(() => setLoading(false));
  }, [form]);

  const luu = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const res = await hopDongTemplateService.upsertThongTinCongTy(values);
      form.setFieldsValue(res);
      message.success("Đã lưu thông tin công ty");
    } catch (err) {
      // Lỗi validate form đã hiện ngay tại field — đừng chồng thêm toast.
      if (err && typeof err === "object" && "errorFields" in err) return;
      message.error(apiErrorMessage(err, "Lưu thông tin công ty thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical" disabled={loading || !canEdit}>
      <Text type="secondary" className="mb-3 block">
        Để trống trường nào thì bản in hiện khoảng trống ở đó, không tự bịa.
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
        extra='Nối vào sau số hợp đồng, vd "/HĐLĐ-MC.1" → "Số: HD0001/HĐLĐ-MC.1".'
      >
        <Input placeholder="/HĐLĐ-MC.1" />
      </Form.Item>
      {canEdit && (
        <div className="flex justify-end">
          <Button type="primary" loading={saving} onClick={luu}>
            Lưu thông tin công ty
          </Button>
        </div>
      )}
    </Form>
  );
}

export default MauInHopDongPage;
