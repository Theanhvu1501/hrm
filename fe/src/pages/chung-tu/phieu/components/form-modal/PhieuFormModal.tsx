import { useEffect } from "react";
import { useFieldLabels } from "@/components/glossary/useFieldLabels";
import dayjs, { Dayjs } from "dayjs";
import { toast } from "sonner";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Row,
  Col,
  Divider,
} from "antd";
import {
  usePhieuState,
  usePhieuHandler,
  usePhieuConfig,
} from "../../PhieuHandlerContext";
import {
  buildDoiTuongSnapshot,
  buildDuAnSnapshot,
  buildBoPhanSnapshot,
  buildSanPhamSnapshot,
  buildDongTienSnapshot,
} from "@/utils/snapshotBuilder";
import { DoiTuong, DuAn, BoPhan, SanPham, DongTien } from "@/types";
import { TaiKhoanItem } from "../../handler/sub-handler/init/init.state";

interface FormValues {
  ngay: Dayjs | null;
  soTien: number;
  noiDung: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  doiTuongMa?: string;
  taiKhoanNoMa?: string;
  taiKhoanCoMa?: string;
  duAnMa?: string;
  boPhanMa?: string;
  sanPhamMa?: string;
  dongTienMa?: string;
}

export function PhieuFormModal() {
  const handler = usePhieuHandler();
  const config = usePhieuConfig();
  const [open, setOpen] = usePhieuState("formModalOpen", false);
  const [editingPhieu] = usePhieuState("editingPhieu", null);

  const [doiTuongList] = usePhieuState("doiTuongList", [] as DoiTuong[]);
  const [duAnList] = usePhieuState("duAnList", [] as DuAn[]);
  const [boPhanList] = usePhieuState("boPhanList", [] as BoPhan[]);
  const [sanPhamList] = usePhieuState("sanPhamList", [] as SanPham[]);
  const [dongTienList] = usePhieuState("dongTienList", [] as DongTien[]);
  const [taiKhoanList] = usePhieuState("taiKhoanList", [] as TaiKhoanItem[]);

  const fl = useFieldLabels('chungTu.phieu');
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (editingPhieu) {
      form.setFieldsValue({
        ngay: editingPhieu.ngay ? dayjs(editingPhieu.ngay) : null,
        soTien: editingPhieu.soTien,
        noiDung: editingPhieu.noiDung,
        nguoiGiaoDich: editingPhieu.nguoiGiaoDich ?? "",
        diaChi: editingPhieu.diaChi ?? "",
        ghiChu: editingPhieu.ghiChu ?? "",
        doiTuongMa: editingPhieu.danhMuc?.doiTuong?.ma,
        taiKhoanNoMa: editingPhieu.danhMuc?.taiKhoanNo?.ma,
        taiKhoanCoMa: editingPhieu.danhMuc?.taiKhoanCo?.ma,
        duAnMa: editingPhieu.danhMuc?.duAn?.ma,
        boPhanMa: editingPhieu.danhMuc?.boPhan?.ma,
        sanPhamMa: editingPhieu.danhMuc?.sanPham?.ma,
        dongTienMa: editingPhieu.danhMuc?.dongTien?.ma,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ ngay: dayjs(), soTien: 0 });
    }
  }, [editingPhieu, open, form]);

  const buildDanhMuc = (v: FormValues): Record<string, unknown> => {
    const danhMuc: Record<string, unknown> = {};
    if (v.doiTuongMa) {
      const f = doiTuongList.find((d) => d.ma === v.doiTuongMa);
      if (f) danhMuc.doiTuong = buildDoiTuongSnapshot(f);
    }
    if (v.taiKhoanNoMa) {
      const f = taiKhoanList.find((t) => t.ma === v.taiKhoanNoMa);
      if (f) danhMuc.taiKhoanNo = { ma: f.ma, ten: f.ten, loai: f.loai, nhom: f.nhom };
    }
    if (v.taiKhoanCoMa) {
      const f = taiKhoanList.find((t) => t.ma === v.taiKhoanCoMa);
      if (f) danhMuc.taiKhoanCo = { ma: f.ma, ten: f.ten, loai: f.loai, nhom: f.nhom };
    }
    if (v.duAnMa) {
      const f = duAnList.find((d) => d.ma === v.duAnMa);
      if (f) danhMuc.duAn = buildDuAnSnapshot(f);
    }
    if (v.boPhanMa) {
      const f = boPhanList.find((b) => b.ma === v.boPhanMa);
      if (f) danhMuc.boPhan = buildBoPhanSnapshot(f);
    }
    if (v.sanPhamMa) {
      const f = sanPhamList.find((s) => s.ma === v.sanPhamMa);
      if (f) danhMuc.sanPham = buildSanPhamSnapshot(f);
    }
    if (v.dongTienMa) {
      const f = dongTienList.find((d) => d.ma === v.dongTienMa);
      if (f) danhMuc.dongTien = buildDongTienSnapshot(f);
    }
    return danhMuc;
  };

  const handleOk = async () => {
    let v: FormValues;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }

    const danhMuc = buildDanhMuc(v);
    const dto = {
      ngay: v.ngay ? v.ngay.format("YYYY-MM-DD") : "",
      soTien: v.soTien,
      noiDung: v.noiDung,
      nguoiGiaoDich: v.nguoiGiaoDich,
      diaChi: v.diaChi,
      ghiChu: v.ghiChu,
      danhMuc: Object.keys(danhMuc).length > 0 ? danhMuc : undefined,
    };

    const ok = await handler.executeEvent("submitPhieu", {
      id: editingPhieu?.id,
      dto: dto as Parameters<typeof handler.executeEvent<"submitPhieu">>[1]["dto"],
    });
    if (ok) {
      toast.success(editingPhieu ? "Đã cập nhật" : "Đã tạo phiếu");
      setOpen(false);
    } else {
      toast.error("Lưu thất bại");
    }
  };

  const tkOptions = taiKhoanList.map((t) => ({
    value: t.ma,
    label: `${t.ma} - ${t.ten}`,
  }));

  return (
    <Modal
      title={`${editingPhieu ? "Sửa" : "Thêm"} ${config.title}`}
      open={open}
      onCancel={() => setOpen(false)}
      onOk={handleOk}
      okText={editingPhieu ? "Cập nhật" : "Thêm mới"}
      cancelText="Hủy"
      width={720}
    >
      <Form form={form} layout="vertical" size="small" className="mt-2">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="ngay"
              label={fl('ngay', 'Ngày')}
              rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="soTien"
              label={fl('soTien', 'Số tiền')}
              rules={[
                { required: true, message: "Vui lòng nhập số tiền" },
                {
                  validator: (_, value) =>
                    value > 0
                      ? Promise.resolve()
                      : Promise.reject(new Error("Số tiền phải lớn hơn 0")),
                },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                step={1000}
                formatter={(v) =>
                  `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(v) => (v ? Number(v.replace(/,/g, "")) : 0)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="noiDung"
          label={fl('noiDung', 'Nội dung')}
          rules={[{ required: true, message: "Vui lòng nhập nội dung" }]}
        >
          <Input.TextArea rows={2} placeholder="Nội dung phiếu..." />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="nguoiGiaoDich" label={fl('nguoiGiaoDich', 'Người giao dịch')}>
              <Input placeholder="Tên người giao dịch" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="diaChi" label={fl('diaChi', 'Địa chỉ')}>
              <Input placeholder="Địa chỉ" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="ghiChu" label={fl('ghiChu', 'Ghi chú')}>
          <Input.TextArea rows={2} placeholder="Ghi chú..." />
        </Form.Item>

        <Divider orientation="left" plain>
          Danh mục
        </Divider>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="doiTuongMa" label={fl('doiTuongMa', 'Đối tượng')}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="-- Chọn đối tượng --"
                options={doiTuongList.map((d) => ({
                  value: d.ma,
                  label: `${d.ma} - ${d.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="taiKhoanNoMa" label={fl('taiKhoanNoMa', 'Tài khoản Nợ')}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="-- Chọn TK Nợ --"
                options={tkOptions}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="taiKhoanCoMa" label={fl('taiKhoanCoMa', 'Tài khoản Có')}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="-- Chọn TK Có --"
                options={tkOptions}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="duAnMa" label={fl('duAnMa', 'Dự án')}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="-- Chọn dự án --"
                options={duAnList.map((d) => ({
                  value: d.ma,
                  label: `${d.ma} - ${d.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="boPhanMa" label={fl('boPhanMa', 'Bộ phận')}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="-- Chọn bộ phận --"
                options={boPhanList.map((b) => ({
                  value: b.ma,
                  label: `${b.ma} - ${b.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="sanPhamMa" label={fl('sanPhamMa', 'Sản phẩm')}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="-- Chọn sản phẩm --"
                options={sanPhamList.map((s) => ({
                  value: s.ma,
                  label: `${s.ma} - ${s.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="dongTienMa" label={fl('dongTienMa', 'Dòng tiền')}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="-- Chọn dòng tiền --"
                options={dongTienList.map((d) => ({
                  value: d.ma,
                  label: `${d.ma} - ${d.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
