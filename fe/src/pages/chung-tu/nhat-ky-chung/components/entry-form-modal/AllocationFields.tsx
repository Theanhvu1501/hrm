import { Form, Select, Row, Col, Input, Tooltip } from "antd";
import { ExclamationCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import { DoiTuong, DuAn, BoPhan, SanPham, DongTien, NhomKhuyenMai, NhomQuanLy, KhoanMuc, HopDong, TaiKhoanNganHang } from "@/types";
import {
  buildDoiTuongSnapshot,
  buildNganHangSnapshot,
  buildDuAnSnapshot,
  buildBoPhanSnapshot,
  buildDoiSnapshot,
  buildNhanVienSnapshot,
  buildSanPhamSnapshot,
  buildDongTienSnapshot,
  buildNhomKhuyenMaiSnapshot,
  buildNhomQuanLySnapshot,
  buildKhoanMucSnapshot,
  buildHopDongSnapshot,
} from "@/utils/snapshotBuilder";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import { MasterDataChanges } from "../../handler/sub-handler/master-data-compare/master-data-compare.types";
import { CollapsibleSection } from "./CollapsibleSection";
import { KhoanMucItem } from "../../handler/sub-handler/init/init.state";
import { getDoiTuongSelectConfig } from "../../doiTuongConfig";

interface AllocationFieldsProps {
  form: ReturnType<typeof Form.useForm>[0];
}

// CSS classes for change status
const getFieldClassName = (
  changes: MasterDataChanges,
  field: keyof MasterDataChanges
): string => {
  const change = changes[field];
  if (!change) return "";
  if (change.status === "deleted") return "field-deleted";
  if (change.status === "changed") return "field-changed";
  return "";
};

// Tooltip content for changed fields
const getChangeTooltip = (
  changes: MasterDataChanges,
  field: keyof MasterDataChanges
): string | null => {
  const change = changes[field];
  if (!change) return null;
  if (change.status === "deleted") {
    return `"${change.oldValue}" đã bị xóa`;
  }
  if (change.status === "changed") {
    return `Đã thay đổi: "${change.oldValue}" → "${change.newValue}"`;
  }
  return null;
};

export function AllocationFields({ form }: AllocationFieldsProps) {
  const handler = useNhatKyChungHandler();
  const [doiTuongList] = useNhatKyChungState("doiTuongList", []);
  const [duAnList] = useNhatKyChungState("duAnList", []);
  const [boPhanList] = useNhatKyChungState("boPhanList", []);
  const [sanPhamList] = useNhatKyChungState("sanPhamList", []);
  const [dongTienList] = useNhatKyChungState("dongTienList", []);
  const [nhomKhuyenMaiList] = useNhatKyChungState("nhomKhuyenMaiList", []);
  const [nhomQuanLyList] = useNhatKyChungState("nhomQuanLyList", []);
  const [khoanMucList] = useNhatKyChungState("khoanMucList", []);
  const [hopDongList] = useNhatKyChungState("hopDongList", []);
  const [masterDataChanges] = useNhatKyChungState("masterDataChanges", {});
  const [taiKhoanList] = useNhatKyChungState("taiKhoanList", []);
  const [nganHangList] = useNhatKyChungState("nganHangList", []);
  const taiKhoanNo = Form.useWatch("taiKhoanNo", form);
  const taiKhoanCo = Form.useWatch("taiKhoanCo", form);

  const tkNoInfo = taiKhoanList?.find((t) => t.ma === taiKhoanNo);
  const tkCoInfo = taiKhoanList?.find((t) => t.ma === taiKhoanCo);
  const doiTuongNoCfg = getDoiTuongSelectConfig(tkNoInfo?.chiTietTheo, doiTuongList ?? [], nganHangList ?? []);
  const doiTuongCoCfg = getDoiTuongSelectConfig(tkCoInfo?.chiTietTheo, doiTuongList ?? [], nganHangList ?? []);

  const handleDoiTuongChange = (value: string | undefined) => {
    // Clear change warning when user selects new value
    handler.executeEvent("clearFieldChange", { field: "doiTuong" });
    if (!value) {
      form.setFieldsValue({ doiTuongSnapshot: undefined });
      return;
    }
    const doiTuong = doiTuongList?.find((d: DoiTuong) => d.id === value);
    if (doiTuong) {
      form.setFieldsValue({ doiTuongSnapshot: buildDoiTuongSnapshot(doiTuong) });
      return;
    }
    const nganHang = nganHangList?.find((nh: TaiKhoanNganHang) => nh.id === value);
    if (nganHang) {
      form.setFieldsValue({ doiTuongSnapshot: buildNganHangSnapshot(nganHang) });
    }
  };

  const handleDoiTuong2Change = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "doiTuong2" });
    if (!value) {
      form.setFieldsValue({ doiTuong2Snapshot: undefined });
      return;
    }
    const doiTuong = doiTuongList?.find((d: DoiTuong) => d.id === value);
    if (doiTuong) {
      form.setFieldsValue({ doiTuong2Snapshot: buildDoiTuongSnapshot(doiTuong) });
      return;
    }
    const nganHang = nganHangList?.find((nh: TaiKhoanNganHang) => nh.id === value);
    if (nganHang) {
      form.setFieldsValue({ doiTuong2Snapshot: buildNganHangSnapshot(nganHang) });
    }
  };

  const handleDuAnChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "duAn" });
    if (!value) {
      form.setFieldsValue({
        duAnSnapshot: undefined,
        chuDauTuMa: undefined,
        chuDauTuTen: undefined,
      });
      return;
    }
    const duAn = duAnList?.find((da: DuAn) => da.id === value);
    if (duAn) {
      form.setFieldsValue({
        duAnSnapshot: buildDuAnSnapshot(duAn),
        chuDauTuMa: duAn.chuDuAnMa,
        chuDauTuTen: duAn.chuDuAn,
      });
    }
  };

  const handleBoPhanChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "boPhan" });
    if (!value) {
      form.setFieldsValue({ boPhanSnapshot: undefined });
      return;
    }
    const boPhan = boPhanList?.find((b: BoPhan) => b.id === value);
    if (boPhan) {
      form.setFieldsValue({ boPhanSnapshot: buildBoPhanSnapshot(boPhan) });
    }
  };

  const handleDoiChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "doi" });
    if (!value) {
      form.setFieldsValue({ doiSnapshot: undefined });
      return;
    }
    const doi = boPhanList?.find((bp: BoPhan) => bp.id === value);
    if (doi) {
      form.setFieldsValue({ doiSnapshot: buildDoiSnapshot(doi) });
    }
  };

  const handleNhanVienChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "nhanVien" });
    if (!value) {
      form.setFieldsValue({ nhanVienSnapshot: undefined });
      return;
    }
    const nhanVien = doiTuongList?.find((d: DoiTuong) => d.id === value);
    if (nhanVien) {
      form.setFieldsValue({
        nhanVienSnapshot: buildNhanVienSnapshot(nhanVien),
      });
    }
  };

  const handleSanPhamChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "sanPham" });
    if (!value) {
      form.setFieldsValue({ sanPhamSnapshot: undefined });
      return;
    }
    const sanPham = sanPhamList?.find((sp: SanPham) => sp.id === value);
    if (sanPham) {
      form.setFieldsValue({ sanPhamSnapshot: buildSanPhamSnapshot(sanPham) });
    }
  };

  const handleDongTienChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "dongTien" });
    if (!value) {
      form.setFieldsValue({ dongTienSnapshot: undefined });
      return;
    }
    const dongTien = dongTienList?.find((dt: DongTien) => dt.id === value);
    if (dongTien) {
      form.setFieldsValue({ dongTienSnapshot: buildDongTienSnapshot(dongTien) });
    }
  };

  const handleNhomKhuyenMaiChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "nhomKhuyenMai" });
    if (!value) {
      form.setFieldsValue({ nhomKhuyenMaiSnapshot: undefined });
      return;
    }
    const nhomKhuyenMai = nhomKhuyenMaiList?.find((nkm: NhomKhuyenMai) => nkm.id === value);
    if (nhomKhuyenMai) {
      form.setFieldsValue({ nhomKhuyenMaiSnapshot: buildNhomKhuyenMaiSnapshot(nhomKhuyenMai) });
    }
  };

  const handleNhomQuanLyChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "nhomQuanLy" });
    if (!value) {
      form.setFieldsValue({ nhomQuanLySnapshot: undefined });
      return;
    }
    const nhomQuanLy = nhomQuanLyList?.find((nql: NhomQuanLy) => nql.id === value);
    if (nhomQuanLy) {
      form.setFieldsValue({ nhomQuanLySnapshot: buildNhomQuanLySnapshot(nhomQuanLy) });
    }
  };

  const handleKhoanMucChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "khoanMuc" });
    if (!value) {
      form.setFieldsValue({ khoanMucSnapshot: undefined });
      return;
    }
    const khoanMuc = khoanMucList?.find((km: KhoanMucItem) => km.id === value);
    if (khoanMuc) {
      form.setFieldsValue({ khoanMucSnapshot: buildKhoanMucSnapshot(khoanMuc as KhoanMuc) });
    }
  };

  const handleHopDongChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "hopDong" });
    if (!value) {
      form.setFieldsValue({ hopDongSnapshot: undefined });
      return;
    }
    const hopDong = hopDongList?.find((hd: HopDong) => hd.id === value);
    if (hopDong) {
      form.setFieldsValue({ hopDongSnapshot: buildHopDongSnapshot(hopDong) });
    }
  };

  // Render label with change indicator
  const renderLabel = (
    label: string,
    field: keyof MasterDataChanges
  ): React.ReactNode => {
    const change = masterDataChanges[field];
    if (!change) return label;

    const tooltip = getChangeTooltip(masterDataChanges, field);
    const icon =
      change.status === "deleted" ? (
        <DeleteOutlined className="text-red-500 ml-1" />
      ) : (
        <ExclamationCircleOutlined className="text-orange-500 ml-1" />
      );

    return (
      <Tooltip title={tooltip}>
        <span>
          {label}
          {icon}
        </span>
      </Tooltip>
    );
  };

  return (
    <>
      <style>{`
        .field-deleted .ant-select-selector {
          border-color: #ff4d4f !important;
          background-color: #fff2f0 !important;
        }
        .field-changed .ant-select-selector {
          border-color: #faad14 !important;
          background-color: #fffbe6 !important;
        }
        .compact-form .ant-form-item {
          margin-bottom: 8px !important;
        }
      `}</style>
      <CollapsibleSection title="Phân bổ" defaultOpen={false} scrollOnOpen={true}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="doiTuongId"
              label={renderLabel("Đối tượng nợ", "doiTuong")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "doiTuong")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn đối tượng nợ"
                optionFilterProp="label"
                onChange={handleDoiTuongChange}
                disabled={doiTuongNoCfg.disabled}
                options={doiTuongNoCfg.options}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="doiTuong2Id"
              label={renderLabel("Đối tượng có", "doiTuong2")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "doiTuong2")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn đối tượng có"
                optionFilterProp="label"
                onChange={handleDoiTuong2Change}
                disabled={doiTuongCoCfg.disabled}
                options={doiTuongCoCfg.options}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="duAnId"
              label={renderLabel("Dự án", "duAn")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "duAn")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn dự án"
                optionFilterProp="label"
                onChange={handleDuAnChange}
                options={duAnList?.map((da: DuAn) => ({
                  value: da.id,
                  label: `${da.ma} - ${da.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="boPhanId"
              label={renderLabel("Bộ phận", "boPhan")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "boPhan")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn bộ phận"
                optionFilterProp="label"
                onChange={handleBoPhanChange}
                options={boPhanList?.map((bp: BoPhan) => ({
                  value: bp.id,
                  label: `${bp.ma} - ${bp.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item name="chuDauTuMa" label="Mã CĐT" className="mb-2">
              <Input disabled placeholder="Tự động" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="chuDauTuTen" label="Chủ đầu tư" className="mb-2">
              <Input disabled placeholder="Tự động theo dự án" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="doiId"
              label={renderLabel("Đội thi công", "doi")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "doi")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn đội thi công"
                optionFilterProp="label"
                onChange={handleDoiChange}
                options={boPhanList
                  ?.filter((bp: BoPhan) => bp.ten.toLowerCase().includes("đội"))
                  .map((bp: BoPhan) => ({
                    value: bp.id,
                    label: `${bp.ma} - ${bp.ten}`,
                  }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="nhanVienId"
              label={renderLabel("Nhân viên phụ trách", "nhanVien")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "nhanVien")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn nhân viên"
                optionFilterProp="label"
                onChange={handleNhanVienChange}
                options={doiTuongList
                  ?.filter((dt: DoiTuong) => dt.loai.includes("NHAN_VIEN"))
                  .map((nv: DoiTuong) => ({
                    value: nv.id,
                    label: `${nv.ma} - ${nv.ten}`,
                  }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="sanPhamId"
              label={renderLabel("Sản phẩm/Vật tư", "sanPham")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "sanPham")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn sản phẩm"
                optionFilterProp="label"
                onChange={handleSanPhamChange}
                options={sanPhamList?.map((sp: SanPham) => ({
                  value: sp.id,
                  label: `${sp.ma} - ${sp.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              name="dongTienId"
              label={renderLabel("Dòng tiền", "dongTien")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "dongTien")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn dòng tiền"
                optionFilterProp="label"
                onChange={handleDongTienChange}
                options={dongTienList?.map((dt: DongTien) => ({
                  value: dt.id,
                  label: `${dt.ma} - ${dt.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="khoanMucId"
              label={renderLabel("Khoản mục", "khoanMuc")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "khoanMuc")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn khoản mục"
                optionFilterProp="label"
                onChange={handleKhoanMucChange}
                options={khoanMucList?.map((km: KhoanMucItem) => ({
                  value: km.id,
                  label: `${km.ma} - ${km.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="nhomKhuyenMaiId"
              label={renderLabel("Nhóm khuyến mại", "nhomKhuyenMai")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "nhomKhuyenMai")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn nhóm khuyến mại"
                optionFilterProp="label"
                onChange={handleNhomKhuyenMaiChange}
                options={nhomKhuyenMaiList?.map((nkm: NhomKhuyenMai) => ({
                  value: nkm.id,
                  label: `${nkm.ma} - ${nkm.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              name="nhomQuanLyId"
              label={renderLabel("Nhóm quản lý", "nhomQuanLy")}
              className={`mb-2 ${getFieldClassName(masterDataChanges, "nhomQuanLy")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn nhóm quản lý"
                optionFilterProp="label"
                onChange={handleNhomQuanLyChange}
                options={nhomQuanLyList?.map((nql: NhomQuanLy) => ({
                  value: nql.id,
                  label: `${nql.ma} - ${nql.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="hopDongId"
              label={renderLabel("Hợp đồng", "hopDong")}
              className={`mb-0 ${getFieldClassName(masterDataChanges, "hopDong")}`}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn hợp đồng"
                optionFilterProp="label"
                onChange={handleHopDongChange}
                options={hopDongList?.map((hd: HopDong) => ({
                  value: hd.id,
                  label: `${hd.soHopDong} - ${hd.tenCongTrinh}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </CollapsibleSection>
      {/* Hidden fields for snapshots */}
      <Form.Item name="doiTuongSnapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="doiTuong2Snapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="duAnSnapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="boPhanSnapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="doiSnapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="nhanVienSnapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="sanPhamSnapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="dongTienSnapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="nhomKhuyenMaiSnapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="nhomQuanLySnapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="khoanMucSnapshot" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="hopDongSnapshot" hidden>
        <Input />
      </Form.Item>
    </>
  );
}
