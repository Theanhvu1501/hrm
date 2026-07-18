import React, { useEffect, useMemo, useState } from 'react';
import {
  Breadcrumb,
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Checkbox,
  Space,
  message,
  Divider,
  Typography,
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  HomeOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  DollarOutlined,
  FileDoneOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { FilterBar } from '@/components/common/FilterBar';
import type {
  TheoDoiHopDongRow,
  ThuTienHopDong,
  HoaDonBanRa,
  DoiTuong,
} from '@/types';
import {
  theoDoiHopDongService,
  type TheoDoiHopDongStats,
} from '@/services/theoDoiHopDongService';
import { thuTienHopDongService } from '@/services/thuTienHopDongService';
import { hoaDonBanRaService } from '@/services/hoaDonBanRaService';
import { doiTuongService } from '@/services/doiTuongService';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';

const { Text, Title } = Typography;

/**
 * Ô dùng để so khớp bộ lọc cột — key trùng `key` của cột antd.
 * Cột "Chủ đầu tư" hiển thị TÊN (map từ id) nên lọc cũng phải khớp trên tên.
 */
const cellValue =
  (doiTuongMap: Record<string, string>) =>
  (r: TheoDoiHopDongRow, key: string): string | undefined => {
    switch (key) {
      case 'soHopDong':
        return r.soHopDong;
      case 'tenCongTrinh':
        return r.tenCongTrinh;
      case 'doiTuongId':
        return doiTuongMap[r.doiTuongId || ''];
      default:
        return undefined;
    }
  };

const fmtCur = (v?: number) =>
  v == null
    ? '0'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const moneyProps = {
  className: 'w-full',
  formatter: (value?: string | number) =>
    `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
  parser: (value?: string) => (value?.replace(/[^\d.-]/g, '') ?? '') as unknown as number,
};

const NAM_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const y = 2022 + i;
  return { value: y, label: `Năm ${y}` };
});

interface ScalarForm {
  phuTrachHoSo?: string;
  trangThaiHoSo?: string;
  quyetToan?: { so?: string; ngay?: Dayjs; giaTri?: number };
  baoHanhTheoDoi?: {
    giaTri?: number;
    soNgay?: number;
    ngayGiaiToaBL?: Dayjs;
    trangThai?: string;
  };
  giamTru?: number;
  tinhTrangHoSo?: {
    hd?: boolean;
    nt1?: boolean;
    nt2?: boolean;
    ntSuDung?: boolean;
    thanhLy?: boolean;
    namQuyetToan?: number;
  };
  ghiChu?: string;
}

export default function QuanLyHopDongPage() {
  const { canEdit } = usePagePermission('/trung-tam-du-lieu/hop-dong');
  const fl = useFieldLabels('trungTamDuLieu.hopDong');

  const [rows, setRows] = useState<TheoDoiHopDongRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TheoDoiHopDongStats>({
    tongGiaTri: 0,
    tongDaThanhToan: 0,
    tongConLai: 0,
  });
  const [doiTuongMap, setDoiTuongMap] = useState<Record<string, string>>({});

  const [search, setSearch] = useState('');
  const [nam, setNam] = useState<number | undefined>(undefined);

  // Drawer editor
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<TheoDoiHopDongRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<ScalarForm>();
  const [receipts, setReceipts] = useState<ThuTienHopDong[]>([]);
  const [invoices, setInvoices] = useState<HoaDonBanRa[]>([]);
  const quyetToanGiaTri = Form.useWatch(['quyetToan', 'giaTri'], form);

  const loadList = async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([
        theoDoiHopDongService.getList({ nam, search: search || undefined }),
        theoDoiHopDongService.getStats(),
      ]);
      setRows(list);
      setStats(st);
    } catch {
      message.error('Không tải được dữ liệu theo dõi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    doiTuongService
      .getAll()
      .then((list: DoiTuong[]) => {
        const map: Record<string, string> = {};
        list.forEach((d) => {
          map[d.id] = d.ten;
        });
        setDoiTuongMap(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam]);

  const openEditor = async (row: TheoDoiHopDongRow) => {
    setCurrent(row);
    setOpen(true);
    form.resetFields();
    setReceipts([]);
    setInvoices([]);
    // Đã thanh toán / Đã trả hóa đơn: tự cộng từ Sổ thu tiền + Sổ HĐ bán ra
    thuTienHopDongService.getList({ hopDongId: row.hopDongId }).then(setReceipts).catch(() => {});
    hoaDonBanRaService.getList({ hopDongId: row.hopDongId }).then(setInvoices).catch(() => {});
    try {
      const t = await theoDoiHopDongService.getByHopDongId(row.hopDongId);
      if (t) {
        form.setFieldsValue({
          phuTrachHoSo: t.phuTrachHoSo,
          trangThaiHoSo: t.trangThaiHoSo,
          quyetToan: t.quyetToan
            ? {
                so: t.quyetToan.so,
                ngay: t.quyetToan.ngay ? dayjs(t.quyetToan.ngay) : undefined,
                giaTri: t.quyetToan.giaTri,
              }
            : undefined,
          baoHanhTheoDoi: t.baoHanhTheoDoi
            ? {
                giaTri: t.baoHanhTheoDoi.giaTri,
                soNgay: t.baoHanhTheoDoi.soNgay,
                ngayGiaiToaBL: t.baoHanhTheoDoi.ngayGiaiToaBL
                  ? dayjs(t.baoHanhTheoDoi.ngayGiaiToaBL)
                  : undefined,
                trangThai: t.baoHanhTheoDoi.trangThai,
              }
            : undefined,
          giamTru: t.giamTru,
          tinhTrangHoSo: t.tinhTrangHoSo,
          ghiChu: t.ghiChu,
        });
      }
    } catch {
      message.error('Không tải được dữ liệu hợp đồng');
    }
  };

  const daThanhToan = useMemo(
    () => receipts.reduce((s, d) => s + (Number(d.soTien) || 0), 0),
    [receipts],
  );
  const daTraHoaDon = useMemo(
    () => invoices.reduce((s, d) => s + (Number(d.tong) || 0), 0),
    [invoices],
  );
  const conLai = useMemo(() => {
    const base = Number(quyetToanGiaTri) || Number(current?.giaTriSauThue) || 0;
    return base - daThanhToan;
  }, [quyetToanGiaTri, current, daThanhToan]);

  const handleSave = async () => {
    if (!current) return;
    const v = await form.validateFields();
    setSaving(true);
    try {
      await theoDoiHopDongService.upsert(current.hopDongId, {
        phuTrachHoSo: v.phuTrachHoSo,
        trangThaiHoSo: v.trangThaiHoSo,
        quyetToan: v.quyetToan
          ? {
              so: v.quyetToan.so,
              ngay: v.quyetToan.ngay?.format('YYYY-MM-DD'),
              giaTri: v.quyetToan.giaTri,
            }
          : undefined,
        baoHanhTheoDoi: v.baoHanhTheoDoi
          ? {
              giaTri: v.baoHanhTheoDoi.giaTri,
              soNgay: v.baoHanhTheoDoi.soNgay,
              ngayGiaiToaBL: v.baoHanhTheoDoi.ngayGiaiToaBL?.format('YYYY-MM-DD'),
              trangThai: v.baoHanhTheoDoi.trangThai,
            }
          : undefined,
        giamTru: v.giamTru,
        tinhTrangHoSo: v.tinhTrangHoSo,
        ghiChu: v.ghiChu,
      });
      message.success('Đã lưu theo dõi hợp đồng');
      setOpen(false);
      loadList();
    } catch (e) {
      const err = e as { errorFields?: unknown };
      if (!err.errorFields) message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Lọc theo cột ở header + cố định cột. Danh sách load hết về client nên lọc client-side;
  // bảng phẳng, không có dòng tổng (3 thẻ Statistic là số tổng TOÀN BỘ từ backend, không
  // phải tổng của bảng) → lọc thẳng trên mảng.
  const { filterable, matches, hasPinned } = useTableColumnFilters('trung-tam-du-lieu-hop-dong');
  const viewRows = useMemo(() => {
    const getValue = cellValue(doiTuongMap);
    return rows.filter((r) => matches(r, getValue));
  }, [rows, matches, doiTuongMap]);

  const columns: ColumnsType<TheoDoiHopDongRow> = [
    filterable<TheoDoiHopDongRow>({
      title: 'Số HĐ',
      dataIndex: 'soHopDong',
      key: 'soHopDong',
      width: 130,
      fixed: 'left',
      render: (v) => <Text strong>{v}</Text>,
    }),
    { title: 'Năm', dataIndex: 'nam', width: 70, align: 'center', render: (v) => v || '-' },
    filterable<TheoDoiHopDongRow>({
      title: 'Tên công trình',
      dataIndex: 'tenCongTrinh',
      key: 'tenCongTrinh',
      width: 220,
      ellipsis: true,
    }),
    filterable<TheoDoiHopDongRow>({
      title: 'Chủ đầu tư',
      dataIndex: 'doiTuongId',
      key: 'doiTuongId',
      width: 160,
      ellipsis: true,
      render: (v: string) => doiTuongMap[v] || '-',
    }),
    { title: 'Giá trị', dataIndex: 'giaTriSauThue', width: 140, align: 'right', render: (v) => fmtCur(v) },
    {
      title: 'Quyết toán',
      width: 140,
      align: 'right',
      render: (_, r) => fmtCur(r.tracking?.quyetToan?.giaTri),
    },
    { title: 'Đã thanh toán', dataIndex: 'daThanhToan', width: 140, align: 'right', render: (v) => <Text type="success">{fmtCur(v)}</Text> },
    { title: 'Đã trả hóa đơn', dataIndex: 'daTraHoaDon', width: 140, align: 'right', render: (v) => fmtCur(v) },
    {
      title: 'Còn lại',
      dataIndex: 'conLai',
      width: 140,
      align: 'right',
      render: (v: number) => <Text type={v > 0 ? 'warning' : undefined}>{fmtCur(v)}</Text>,
    },
    // Không gắn lọc: cột này vốn không có `key`. Thêm key để lọc sẽ đưa nó vào "Chọn cột",
    // và người dùng từng lưu lựa chọn cột sẽ bị mất cột này cho tới khi tự tick lại.
    { title: 'Phụ trách', width: 130, ellipsis: true, render: (_, r) => r.tracking?.phuTrachHoSo || '-' },
    {
      title: '',
      key: 'action',
      width: 90,
      fixed: 'right',
      align: 'center',
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openEditor(r)}>
          Theo dõi
        </Button>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('trungTamDuLieu.hopDong', columns);

  // Danh sách khoản thu (read-only, từ Sổ thu tiền)
  const receiptCols: ColumnsType<ThuTienHopDong> = [
    { title: 'Ngày', dataIndex: 'ngay', width: 100, render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-') },
    { title: 'Nội dung', dataIndex: 'noiDung', ellipsis: true, render: (v) => v || '-' },
    { title: 'Lần', dataIndex: 'lan', width: 50, align: 'center', render: (v) => v || '-' },
    { title: 'Số tiền', dataIndex: 'soTien', width: 130, align: 'right', render: (v) => fmtCur(v) },
  ];
  const invoiceCols: ColumnsType<HoaDonBanRa> = [
    { title: 'Số HĐ', dataIndex: 'soHoaDon', width: 70, align: 'center', render: (v) => v || '-' },
    { title: 'Ngày', dataIndex: 'ngay', width: 100, render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-') },
    { title: 'Đơn vị mua', dataIndex: 'donViMua', ellipsis: true, render: (v) => v || '-' },
    { title: 'Tổng', dataIndex: 'tong', width: 130, align: 'right', render: (v) => fmtCur(v) },
  ];

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: '/', title: <><HomeOutlined /> Trang chủ</> },
          { title: 'Trung tâm dữ liệu' },
          { title: 'Quản lý Hợp đồng' },
        ]}
      />

      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Card className="stat-card" size="small">
            <Statistic title="Tổng giá trị HĐ" value={stats.tongGiaTri} formatter={(v) => fmtCur(Number(v))} prefix={<DollarOutlined className="text-blue-500" />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card" size="small">
            <Statistic title="Đã thanh toán" value={stats.tongDaThanhToan} formatter={(v) => fmtCur(Number(v))} prefix={<FileDoneOutlined className="text-green-500" />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card" size="small">
            <Statistic title="Còn lại" value={stats.tongConLai} formatter={(v) => fmtCur(Number(v))} prefix={<WalletOutlined className="text-orange-500" />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <FilterBar
          search={{
            value: search,
            onChange: setSearch,
            onSearch: loadList,
            placeholder: 'Tìm theo số HĐ, tên công trình...',
            width: 320,
          }}
          onReset={() => {
            setSearch('');
            setNam(undefined);
          }}
          actions={
            <>
              <Select
                allowClear
                placeholder="Lọc theo năm"
                style={{ width: 140 }}
                options={NAM_OPTIONS}
                value={nam}
                onChange={(v) => setNam(v)}
              />
              {settingsButton}
            </>
          }
        />

        <Table<TheoDoiHopDongRow>
          columns={cfgColumns}
          dataSource={viewRows}
          rowKey="hopDongId"
          loading={loading}
          size="small"
          // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được.
          scroll={{ x: hasPinned ? 'max-content' : 1500 }}
          pagination={{ pageSize: 20, showTotal: (t) => `Tổng ${t} hợp đồng` }}
        />
      </Card>

      <Drawer
        title={current ? `Theo dõi: ${current.soHopDong}` : 'Theo dõi hợp đồng'}
        open={open}
        onClose={() => setOpen(false)}
        width={760}
        extra={
          canEdit && (
            <Button type="primary" loading={saving} onClick={handleSave}>
              Lưu
            </Button>
          )
        }
      >
        {current && (
          <div className="space-y-2">
            {/* Thông tin HĐ (chỉ đọc) */}
            <Card size="small" className="bg-gray-50">
              <Row gutter={12}>
                <Col span={12}><Text type="secondary">Tên công trình:</Text> {current.tenCongTrinh}</Col>
                <Col span={6}><Text type="secondary">Giá trị:</Text> {fmtCur(current.giaTriSauThue)}</Col>
                <Col span={6}><Text type="secondary">Chủ đầu tư:</Text> {doiTuongMap[current.doiTuongId || ''] || '-'}</Col>
              </Row>
            </Card>

            <Form form={form} layout="vertical" size="small">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="phuTrachHoSo" label={fl('phuTrachHoSo', 'Phụ trách hồ sơ')}>
                    <Input placeholder="Tên người phụ trách" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="trangThaiHoSo" label={fl('trangThaiHoSo', 'Trạng thái hồ sơ')}>
                    <Input placeholder="VD: Đang theo dõi" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Quyết toán</Divider>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name={['quyetToan', 'so']} label="Số quyết toán">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={['quyetToan', 'ngay']} label="Ngày">
                    <DatePicker format="DD/MM/YYYY" className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={['quyetToan', 'giaTri']} label="Giá trị quyết toán">
                    <InputNumber {...moneyProps} addonAfter="VNĐ" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Bảo hành theo dõi</Divider>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name={['baoHanhTheoDoi', 'giaTri']} label="Giá trị BH">
                    <InputNumber {...moneyProps} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name={['baoHanhTheoDoi', 'soNgay']} label="Số ngày">
                    <InputNumber className="w-full" min={0} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name={['baoHanhTheoDoi', 'ngayGiaiToaBL']} label="Ngày giải tỏa BL">
                    <DatePicker format="DD/MM/YYYY" className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name={['baoHanhTheoDoi', 'trangThai']} label="Trạng thái">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="giamTru" label={fl('giamTru', 'Giảm trừ')}>
                <InputNumber {...moneyProps} addonAfter="VNĐ" style={{ width: 240 }} />
              </Form.Item>

              <Divider orientation="left">Các khoản thu (từ Sổ thu tiền)</Divider>
              <Text type="secondary" className="text-xs">Nhập ở mục Trung tâm dữ liệu → Thu tiền hợp đồng; tại đây chỉ xem và tự cộng.</Text>
              <Table size="small" rowKey={(r) => r.id || ''} columns={receiptCols} dataSource={receipts} pagination={false} locale={{ emptyText: 'Chưa có khoản thu' }} />

              <Divider orientation="left">Hóa đơn bán ra</Divider>
              <Table size="small" rowKey={(r) => r.id || ''} columns={invoiceCols} dataSource={invoices} pagination={false} locale={{ emptyText: 'Chưa có hóa đơn' }} />

              <Divider orientation="left">Tình trạng hồ sơ</Divider>
              <Space wrap size="large">
                <Form.Item name={['tinhTrangHoSo', 'hd']} valuePropName="checked" noStyle><Checkbox>HĐ</Checkbox></Form.Item>
                <Form.Item name={['tinhTrangHoSo', 'nt1']} valuePropName="checked" noStyle><Checkbox>NT1</Checkbox></Form.Item>
                <Form.Item name={['tinhTrangHoSo', 'nt2']} valuePropName="checked" noStyle><Checkbox>NT2</Checkbox></Form.Item>
                <Form.Item name={['tinhTrangHoSo', 'ntSuDung']} valuePropName="checked" noStyle><Checkbox>NT đưa vào sử dụng</Checkbox></Form.Item>
                <Form.Item name={['tinhTrangHoSo', 'thanhLy']} valuePropName="checked" noStyle><Checkbox>Thanh lý</Checkbox></Form.Item>
                <Form.Item name={['tinhTrangHoSo', 'namQuyetToan']} label="Năm QT" className="mb-0">
                  <InputNumber min={1900} max={2200} controls={false} />
                </Form.Item>
              </Space>

              <Form.Item name="ghiChu" label={fl('ghiChu', 'Ghi chú')} className="mt-3">
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
              </Form.Item>
            </Form>

            {/* Tổng tự tính */}
            <Card size="small">
              <Row gutter={12}>
                <Col span={8}><Title level={5} className="!mb-0">Đã thanh toán: <Text type="success">{fmtCur(daThanhToan)}</Text></Title></Col>
                <Col span={8}><Title level={5} className="!mb-0">Đã trả hóa đơn: {fmtCur(daTraHoaDon)}</Title></Col>
                <Col span={8}><Title level={5} className="!mb-0">Còn lại: <Text type="warning">{fmtCur(conLai)}</Text></Title></Col>
              </Row>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}
