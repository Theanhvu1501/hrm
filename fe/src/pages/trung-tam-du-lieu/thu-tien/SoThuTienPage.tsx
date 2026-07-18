import React, { useEffect, useMemo, useState } from 'react';
import {
  Breadcrumb,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Space,
  Popconfirm,
  message,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  HomeOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { FilterBar } from '@/components/common/FilterBar';
import type { ThuTienHopDong, TheoDoiHopDongRow, DoiTuong } from '@/types';
import { thuTienHopDongService } from '@/services/thuTienHopDongService';
import { theoDoiHopDongService } from '@/services/theoDoiHopDongService';
import { doiTuongService } from '@/services/doiTuongService';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useBulkDelete } from '@/components/table/useBulkDelete';
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';

/** Ô dùng để so khớp bộ lọc cột — key trùng `key` của cột antd. */
const cellValue = (r: ThuTienHopDong, key: string): string | undefined => {
  switch (key) {
    case 'soHopDong':
      return r.soHopDong;
    case 'tenKhachHang':
      return r.tenKhachHang;
    case 'noiDung':
      return r.noiDung;
    default:
      return undefined;
  }
};

const { Text } = Typography;
const fmtCur = (v?: number) => (!v ? '-' : new Intl.NumberFormat('vi-VN').format(v));
const moneyProps = {
  className: 'w-full',
  formatter: (value?: string | number) => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
  parser: (value?: string) => (value?.replace(/[^\d.-]/g, '') ?? '') as unknown as number,
};

interface FormVals {
  hopDongId: string;
  doiTuongId?: string;
  noiDung?: string;
  soTien?: number;
  ngay?: Dayjs;
  lan?: number;
  nam?: number;
  ghiChu?: string;
}

export default function SoThuTienPage() {
  const { canCreate, canEdit, canDelete } = usePagePermission('/trung-tam-du-lieu/thu-tien-hop-dong');
  const [rows, setRows] = useState<ThuTienHopDong[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [hdList, setHdList] = useState<TheoDoiHopDongRow[]>([]);
  const [dtList, setDtList] = useState<DoiTuong[]>([]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm<FormVals>();

  // ThuTienHopDong khai báo `id?: string` nên dùng thẳng `{ id: string }` cho tham số kiểu của hook.
  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<{ id: string }>({
    enabled: canDelete,
    itemLabel: 'phiếu thu tiền',
    onDeleteBatch: (ids) => thuTienHopDongService.deleteBatch(ids),
    onDone: () => load(),
  });

  const load = async () => {
    // Lựa chọn chỉ có hiệu lực trên tập dòng đang xem: tìm kiếm / tải lại đều bỏ chọn.
    clearSelection();
    setLoading(true);
    try {
      setRows(await thuTienHopDongService.getList({ search: search || undefined }));
    } catch {
      message.error('Không tải được sổ thu tiền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    theoDoiHopDongService.getList().then(setHdList).catch(() => {});
    doiTuongService.getAll().then(setDtList).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = (r?: ThuTienHopDong) => {
    if (r) {
      setEditingId(r.id || null);
      form.setFieldsValue({
        hopDongId: r.hopDongId,
        doiTuongId: r.doiTuongId,
        noiDung: r.noiDung,
        soTien: r.soTien,
        ngay: r.ngay ? dayjs(r.ngay) : undefined,
        lan: r.lan,
        nam: r.nam,
        ghiChu: r.ghiChu,
      });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setOpen(true);
  };

  const onHopDongChange = (id: string) => {
    const hd = hdList.find((h) => h.hopDongId === id);
    if (hd) {
      form.setFieldsValue({ nam: hd.nam, doiTuongId: hd.doiTuongId });
    }
  };

  const save = async () => {
    const v = await form.validateFields();
    const hd = hdList.find((h) => h.hopDongId === v.hopDongId);
    const dt = dtList.find((d) => d.id === v.doiTuongId);
    const payload: Omit<ThuTienHopDong, 'id'> = {
      hopDongId: v.hopDongId,
      soHopDong: hd?.soHopDong,
      nam: v.nam ?? hd?.nam,
      doiTuongId: v.doiTuongId,
      tenKhachHang: dt?.ten,
      noiDung: v.noiDung,
      soTien: v.soTien ?? 0,
      ngay: v.ngay?.format('YYYY-MM-DD'),
      lan: v.lan,
      ghiChu: v.ghiChu,
    };
    try {
      if (editingId) await thuTienHopDongService.update(editingId, payload);
      else await thuTienHopDongService.create(payload);
      message.success('Đã lưu phiếu thu');
      setOpen(false);
      load();
    } catch {
      message.error('Lưu thất bại');
    }
  };

  const remove = async (id: string) => {
    try {
      await thuTienHopDongService.remove(id);
      message.success('Đã xóa');
      load();
    } catch {
      message.error('Xóa thất bại');
    }
  };

  // Lọc theo cột ở header + cố định cột. Dữ liệu load hết về client nên lọc client-side;
  // bảng phẳng, không có dòng tổng → lọc thẳng trên mảng.
  const { filterable, matches, hasPinned } = useTableColumnFilters('trung-tam-du-lieu-so-thu-tien');
  const viewRows = useMemo(() => rows.filter((r) => matches(r, cellValue)), [rows, matches]);

  // Đổi bộ lọc cột → tập dòng đang xem đổi theo (`matches` chỉ đổi khi bộ lọc đổi) → bỏ chọn.
  useEffect(() => {
    clearSelection();
  }, [matches, clearSelection]);

  const columns: ColumnsType<ThuTienHopDong> = [
    { title: 'Năm', dataIndex: 'nam', width: 70, align: 'center', render: (v) => v || '-' },
    filterable<ThuTienHopDong>({
      title: 'Số HĐ',
      dataIndex: 'soHopDong',
      key: 'soHopDong',
      width: 150,
      render: (v) => <Text strong>{v || '-'}</Text>,
    }),
    filterable<ThuTienHopDong>({
      title: 'Tên khách hàng',
      dataIndex: 'tenKhachHang',
      key: 'tenKhachHang',
      width: 200,
      ellipsis: true,
      render: (v) => v || '-',
    }),
    filterable<ThuTienHopDong>({
      title: 'Nội dung',
      dataIndex: 'noiDung',
      key: 'noiDung',
      ellipsis: true,
      render: (v) => v || '-',
    }),
    { title: 'Số tiền', dataIndex: 'soTien', width: 150, align: 'right', render: (v) => <Text type="success">{fmtCur(v)}</Text> },
    { title: 'Ngày', dataIndex: 'ngay', width: 110, render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-') },
    { title: 'Lần', dataIndex: 'lan', width: 60, align: 'center', render: (v) => v || '-' },
    {
      title: '',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <Space size={4}>
          {canEdit && <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />}
          {canDelete && (
            <Popconfirm title="Xóa phiếu thu này?" okText="Xóa" cancelText="Hủy" onConfirm={() => remove(r.id!)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('trungTamDuLieu.soThuTien', columns);
  const fl = useFieldLabels('trungTamDuLieu.soThuTien');

  const hdOptions = hdList.map((h) => ({
    value: h.hopDongId,
    label: `${h.soHopDong}${h.tenCongTrinh ? ' — ' + h.tenCongTrinh : ''}`,
  }));
  const dtOptions = dtList.map((d) => ({ value: d.id, label: `${d.ma} - ${d.ten}` }));

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: '/', title: <><HomeOutlined /> Trang chủ</> },
          { title: 'Trung tâm dữ liệu' },
          { title: 'Thu tiền hợp đồng' },
        ]}
      />
      <Card className="shadow-sm">
        <FilterBar
          search={{ value: search, onChange: setSearch, onSearch: load, placeholder: 'Tìm số HĐ, khách hàng, nội dung...', width: 320 }}
          onReset={() => { setSearch(''); load(); }}
          actions={<>{settingsButton}{bulkDeleteButton}{canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm phiếu thu</Button>}</>}
        />
        <Table<ThuTienHopDong>
          columns={cfgColumns}
          dataSource={viewRows}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          size="small"
          // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được.
          scroll={{ x: hasPinned ? 'max-content' : 1000 }}
          pagination={{ pageSize: 20, showTotal: (t) => `Tổng ${t} phiếu thu` }}
        />
      </Card>

      <Modal
        title={editingId ? 'Sửa phiếu thu' : 'Thêm phiếu thu'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        okText={editingId ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2">
          <Form.Item name="hopDongId" label={fl('hopDongId', 'Hợp đồng')} rules={[{ required: true, message: 'Chọn hợp đồng' }]}>
            <Select showSearch optionFilterProp="label" options={hdOptions} placeholder="Chọn hợp đồng" onChange={onHopDongChange} />
          </Form.Item>
          <Form.Item name="doiTuongId" label={fl('doiTuongId', 'Khách hàng')}>
            <Select showSearch allowClear optionFilterProp="label" options={dtOptions} placeholder="Chọn khách hàng" />
          </Form.Item>
          <Form.Item name="noiDung" label={fl('noiDung', 'Nội dung')}>
            <Input placeholder="VD: Thanh toán lần 1" />
          </Form.Item>
          <Space size="large" className="flex">
            <Form.Item name="soTien" label={fl('soTien', 'Số tiền')} rules={[{ required: true, message: 'Nhập số tiền' }]}>
              <InputNumber {...moneyProps} addonAfter="VNĐ" style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="ngay" label={fl('ngay', 'Ngày')}>
              <DatePicker format="DD/MM/YYYY" className="w-full" />
            </Form.Item>
            <Form.Item name="lan" label={fl('lan', 'Lần')}>
              <InputNumber min={1} className="w-full" />
            </Form.Item>
            <Form.Item name="nam" label={fl('nam', 'Năm')}>
              <InputNumber min={1900} max={2200} controls={false} className="w-full" />
            </Form.Item>
          </Space>
          <Form.Item name="ghiChu" label={fl('ghiChu', 'Ghi chú')}>
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
