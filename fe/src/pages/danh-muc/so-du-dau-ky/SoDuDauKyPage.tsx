import { ExpandCollapseButtons } from '@/components/common/ExpandCollapseButtons';
import { usePagePermission } from '@/hooks/usePagePermission';
import { doiTuongService } from '@/services/doiTuongService';
import { nganHangService } from '@/services/nganHangService';
import { soDuDauKyService } from '@/services/soDuDauKyService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { DeleteOutlined, HomeOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';
import type { ColumnsType } from 'antd/es/table';
import { buildSoDuTree, collectExpandKeys, type SoDuTreeNode } from './buildSoDuTree';
import { collectVisibleRows, filterSoDuTree } from './soDuFilter';
import {
  CHI_TIET_LABEL, DOI_TUONG_LOAI, validateRows,
  type ChiTietLoai, type SoDuRow,
} from './chiTietConfig';

const { Text } = Typography;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('vi-VN').format(v || 0);

interface DoiTuongOption { value: string; label: string; ma: string; ten: string; }
interface LeafAccount { ma: string; ten: string; chiTietTheo?: ChiTietLoai; }

// Dòng đã lưu nhưng options chưa nạp → seed 1 option từ tên đã denormalize
// để hiển thị tên thay vì UUID trước khi user focus vào Select.
const seedCurrentOpt = (opts: DoiTuongOption[], row: SoDuRow): DoiTuongOption[] => {
  if (!row.chiTietId || opts.some((o) => o.value === row.chiTietId)) return opts;
  return [
    {
      value: row.chiTietId,
      label: row.chiTietMa
        ? `${row.chiTietMa} - ${row.chiTietTen ?? ''}`
        : row.chiTietTen ?? row.chiTietId,
      ma: row.chiTietMa ?? '',
      ten: row.chiTietTen ?? '',
    },
    ...opts,
  ];
};

let rowSeq = 0;
const newKey = () => `row-${++rowSeq}-${Date.now()}`;

const SoDuDauKyPage: React.FC = () => {
  const { canEdit } = usePagePermission('/danh-muc/so-du-dau-ky');
  const [rows, setRows] = useState<SoDuRow[]>([]);
  const [leafAccounts, setLeafAccounts] = useState<LeafAccount[]>([]);
  const [chart, setChart] = useState<{ ma: string; ten: string }[]>([]);
  const [ngayApDung, setNgayApDung] = useState<Dayjs>(dayjs().startOf('year'));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [optCache, setOptCache] = useState<Record<string, DoiTuongOption[]>>({});
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const leafMap = useMemo(() => {
    const m = new Map<string, LeafAccount>();
    leafAccounts.forEach((a) => m.set(a.ma, a));
    return m;
  }, [leafAccounts]);

  const loadOptions = useCallback(
    async (loai: ChiTietLoai): Promise<DoiTuongOption[]> => {
      if (optCache[loai]) return optCache[loai];
      let opts: DoiTuongOption[] = [];
      if (loai === 'NGAN_HANG_QUY') {
        const list = await nganHangService.getAll();
        opts = list.map((n) => ({
          value: n.id, label: `${n.ma} - ${n.ten}`, ma: n.ma, ten: n.ten,
        }));
      } else {
        const dtLoai = DOI_TUONG_LOAI[loai] as
          'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU';
        const list = await doiTuongService.getByLoai(dtLoai);
        opts = list.map((d) => ({
          value: d.id, label: `${d.ma} - ${d.ten}`, ma: d.ma, ten: d.ten,
        }));
      }
      setOptCache((p) => ({ ...p, [loai]: opts }));
      return opts;
    },
    [optCache],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [leaf, all, opening] = await Promise.all([
        taiKhoanService.getLeafAccounts(),
        taiKhoanService.getHierarchy(),
        soDuDauKyService.getAll(),
      ]);
      const leafList: LeafAccount[] = leaf.map((a) => ({
        ma: a.ma, ten: a.ten,
        chiTietTheo: a.chiTietTheo as ChiTietLoai | undefined,
      }));
      const chartList = all.map((a) => ({ ma: a.ma, ten: a.ten }));
      setLeafAccounts(leafList);
      setChart(chartList);

      const leafLookup = new Map(leafList.map((a) => [a.ma, a]));
      const nextRows: SoDuRow[] = opening.items.map((i) => ({
        key: newKey(),
        maTaiKhoan: i.maTaiKhoan,
        tenTaiKhoan: leafLookup.get(i.maTaiKhoan)?.ten ?? '',
        chiTietTheo:
          (i.chiTietType as ChiTietLoai | undefined) ??
          leafLookup.get(i.maTaiKhoan)?.chiTietTheo,
        chiTietId: i.chiTietId,
        chiTietMa: i.chiTietMa,
        chiTietTen: i.chiTietTen,
        nganHang: i.nganHang,
        duNo: Number(i.duNo) || 0,
        duCo: Number(i.duCo) || 0,
      }));
      setRows(nextRows);
      if (opening.ngayApDung) setNgayApDung(dayjs(opening.ngayApDung));
      setExpandedKeys(collectExpandKeys(buildSoDuTree(nextRows, chartList)));
    } catch {
      message.error('Không tải được dữ liệu số dư đầu kỳ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const tree = useMemo(() => buildSoDuTree(rows, chart), [rows, chart]);

  // Lọc theo cột ở header + cố định cột. Lọc trên CÂY (không lọc phẳng) để giữ dòng TK cha và
  // cộng lại số tổng của cha theo đúng những dòng còn hiển thị.
  const { filters, filtering, hasPinned, filterable } =
    useTableColumnFilters('danh-muc-so-du-dau-ky');
  const viewTree = useMemo(() => filterSoDuTree(tree, filters), [tree, filters]);

  // Đang lọc thì mở hết nhánh còn lại, nếu không dòng khớp có thể nằm trong nhánh đang thu gọn.
  const viewExpandedKeys = useMemo(
    () => (filtering ? collectExpandKeys(viewTree) : expandedKeys),
    [filtering, viewTree, expandedKeys],
  );

  const patchRow = (key: string, patch: Partial<SoDuRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Mở đường dẫn cha → TK vừa thêm để thấy ngay dòng mới (không thu gọn các node khác)
  const expandPathTo = (ma: string) => {
    const keys = new Set<string>([`acc:${ma}`]);
    for (const a of chart) {
      if (ma.startsWith(a.ma)) keys.add(`acc:${a.ma}`);
    }
    setExpandedKeys((prev) => Array.from(new Set([...prev.map(String), ...keys])));
  };

  const addAccount = (ma: string) => {
    const acc = leafMap.get(ma);
    if (!acc) return;
    if (!acc.chiTietTheo && rows.some((r) => r.maTaiKhoan === ma)) {
      message.info(`Tài khoản ${ma} đã có trong danh sách`);
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        key: newKey(), maTaiKhoan: ma, tenTaiKhoan: acc.ten,
        chiTietTheo: acc.chiTietTheo,
        chiTietId: undefined, chiTietMa: undefined, chiTietTen: undefined,
        nganHang: undefined, duNo: 0, duCo: 0,
      },
    ]);
    if (acc.chiTietTheo) loadOptions(acc.chiTietTheo);
    expandPathTo(ma);
  };

  const addObjectRow = (ma: string, chiTietTheo: ChiTietLoai) => {
    const acc = leafMap.get(ma);
    setRows((prev) => [
      ...prev,
      {
        key: newKey(), maTaiKhoan: ma, tenTaiKhoan: acc?.ten ?? '',
        chiTietTheo,
        chiTietId: undefined, chiTietMa: undefined, chiTietTen: undefined,
        nganHang: undefined, duNo: 0, duCo: 0,
      },
    ]);
    loadOptions(chiTietTheo);
    expandPathTo(ma);
  };

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key));

  const handleSelectDoiTuong = (key: string, loai: ChiTietLoai, id: string) => {
    const opt = (optCache[loai] || []).find((o) => o.value === id);
    patchRow(key, { chiTietId: id, chiTietMa: opt?.ma, chiTietTen: opt?.ten });
  };

  const { tongNo, tongCo } = useMemo(
    () => rows.reduce(
      (a, r) => ({ tongNo: a.tongNo + (r.duNo || 0), tongCo: a.tongCo + (r.duCo || 0) }),
      { tongNo: 0, tongCo: 0 },
    ),
    [rows],
  );
  const canDoi = Math.round(tongNo * 100) === Math.round(tongCo * 100);

  // Dòng TỔNG CỘNG cộng theo các dòng ĐANG HIỂN THỊ (khớp với cái user nhìn thấy). Cảnh báo
  // cân đối thì vẫn xét trên TOÀN BỘ số dư — đó là tính đúng đắn của dữ liệu, không phụ thuộc bộ lọc.
  const { tongNoView, tongCoView } = useMemo(() => {
    if (!filtering) return { tongNoView: tongNo, tongCoView: tongCo };
    return collectVisibleRows(viewTree).reduce(
      (a, r) => ({
        tongNoView: a.tongNoView + (r.duNo || 0),
        tongCoView: a.tongCoView + (r.duCo || 0),
      }),
      { tongNoView: 0, tongCoView: 0 },
    );
  }, [filtering, viewTree, tongNo, tongCo]);

  const accountOptions = useMemo(
    () => leafAccounts.map((a) => ({ value: a.ma, label: `${a.ma} - ${a.ten}` })),
    [leafAccounts],
  );

  const handleSave = async () => {
    const check = validateRows(rows);
    if (!check.ok) { message.error(check.message); return; }
    setSaving(true);
    try {
      const result = await soDuDauKyService.saveBulk({
        ngayApDung: ngayApDung.toISOString(),
        items: rows.map((r) => ({
          maTaiKhoan: r.maTaiKhoan,
          duNo: r.duNo || 0,
          duCo: r.duCo || 0,
          chiTietType: r.chiTietTheo,
          chiTietId: r.chiTietId,
          chiTietMa: r.chiTietMa,
          chiTietTen: r.chiTietTen,
          nganHang: r.nganHang,
        })),
      });
      if (!result.canDoi) message.warning('Đã lưu — lưu ý tổng Nợ và tổng Có chưa cân đối');
      else message.success('Lưu số dư đầu kỳ thành công');
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const doiTuongCell = (node: SoDuTreeNode) => {
    if (node.kind === 'account') {
      return (
        <Text strong={node.__isParent}>{`${node.__ma} - ${node.ten}`}</Text>
      );
    }
    // Lá đối tượng: thụt vào dưới TK cha + chọn đối tượng (ngân hàng cũng chọn ở đây)
    const row = node.row!;
    const loai = row.chiTietTheo!;
    const opts = seedCurrentOpt(optCache[loai] || [], row);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 24 }}>
        <span style={{ color: '#bfbfbf', flex: 'none' }}>•</span>
        <Select
          style={{ flex: 1, minWidth: 200 }} showSearch optionFilterProp="label"
          placeholder={loai === 'NGAN_HANG_QUY' ? 'Chọn ngân hàng' : `Chọn ${CHI_TIET_LABEL[loai]}`}
          disabled={!canEdit} value={row.chiTietId} options={opts}
          onFocus={() => loadOptions(loai)}
          onChange={(v) => handleSelectDoiTuong(row.key, loai, v)}
        />
      </div>
    );
  };

  const nganHangCell = (node: SoDuTreeNode) => {
    if (node.__isParent || !node.row) return null;
    const row = node.row;
    // TK loại Ngân hàng đã chọn ở cột Đối tượng → cột này để trống
    if (row.chiTietTheo === 'NGAN_HANG_QUY') return null;
    return (
      <Input
        placeholder="Ngân hàng (gõ tay)" disabled={!canEdit}
        value={row.nganHang ?? ''}
        onChange={(e) => patchRow(row.key, { nganHang: e.target.value })}
      />
    );
  };

  const numberCell = (node: SoDuTreeNode, field: 'duNo' | 'duCo') => {
    if (node.__isParent) {
      return <Text strong>{formatCurrency(node.__rollup[field])}</Text>;
    }
    if (!node.row) return null;
    const row = node.row;
    return (
      <InputNumber
        style={{ width: '100%' }} value={row[field]} disabled={!canEdit} min={0}
        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        parser={(v) => Number((v || '').replace(/,/g, ''))}
        onChange={(v) => patchRow(row.key, { [field]: Number(v) || 0 })}
      />
    );
  };

  const actionCell = (node: SoDuTreeNode) => {
    if (node.kind === 'account' && node.__isParent && node.chiTietTheo) {
      return (
        <Button type="link" size="small" icon={<PlusOutlined />} disabled={!canEdit}
          onClick={() => addObjectRow(node.__ma, node.chiTietTheo!)}>
          {`Thêm ${CHI_TIET_LABEL[node.chiTietTheo]}`}
        </Button>
      );
    }
    if (!node.__isParent && node.row) {
      return (
        <Popconfirm title="Xoá dòng này?" disabled={!canEdit}
          onConfirm={() => removeRow(node.row!.key)}>
          <Button type="text" danger icon={<DeleteOutlined />} disabled={!canEdit} />
        </Popconfirm>
      );
    }
    return null;
  };

  const columns: ColumnsType<SoDuTreeNode> = [
    filterable<SoDuTreeNode>({ title: 'Tài khoản / Đối tượng', key: 'tk', width: 360,
      render: (_: unknown, node: SoDuTreeNode) => doiTuongCell(node) }),
    { title: 'Ngân hàng', key: 'nh', width: 260,
      render: (_: unknown, node: SoDuTreeNode) => nganHangCell(node) },
    { title: 'Dư Nợ đầu kỳ', key: 'duNo', width: 160, align: 'right' as const,
      render: (_: unknown, node: SoDuTreeNode) => numberCell(node, 'duNo') },
    { title: 'Dư Có đầu kỳ', key: 'duCo', width: 160, align: 'right' as const,
      render: (_: unknown, node: SoDuTreeNode) => numberCell(node, 'duCo') },
    { title: '', key: 'op', width: 200,
      render: (_: unknown, node: SoDuTreeNode) => actionCell(node) },
  ];

  return (
    <div >
      <Breadcrumb style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          { title: 'Danh mục' },
          { title: 'Số dư đầu kỳ' },
        ]} />
      <Card
        title="Khai báo số dư đầu kỳ"
        extra={
          <Space>
            <Text>Ngày áp dụng:</Text>
            <DatePicker value={ngayApDung} format="DD/MM/YYYY" allowClear={false}
              disabled={!canEdit} onChange={(d) => d && setNgayApDung(d)} />
            <Button type="primary" icon={<SaveOutlined />} loading={saving}
              disabled={!canEdit} onClick={handleSave}>Lưu</Button>
          </Space>
        }>
        {!canDoi && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            message={`Tổng Nợ (${formatCurrency(tongNo)}) ≠ Tổng Có (${formatCurrency(tongCo)}) — số dư đầu kỳ chưa cân đối`} />
        )}
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            style={{ width: 320 }} showSearch optionFilterProp="label"
            placeholder="+ Thêm tài khoản (chọn TK chi tiết)"
            disabled={!canEdit} value={undefined} options={accountOptions}
            onChange={(v) => v && addAccount(v)}
          />
          <ExpandCollapseButtons
            onExpandAll={() => setExpandedKeys(collectExpandKeys(tree))}
            onCollapseAll={() => setExpandedKeys([])}
          />
        </Space>
        <Table<SoDuTreeNode>
          rowKey="__key" loading={loading} dataSource={viewTree} columns={columns}
          pagination={false} size="small"
          // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được → cần scroll.x.
          scroll={{ x: hasPinned ? 'max-content' : undefined, y: 'calc(100vh - 400px)' }}
          expandable={{
            expandedRowKeys: viewExpandedKeys,
            onExpandedRowsChange: (keys) => setExpandedKeys([...keys]),
          }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text strong>{filtering ? 'Tổng cộng (đang lọc)' : 'Tổng cộng'}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong>{formatCurrency(tongNoView)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong type={canDoi ? undefined : 'danger'}>
                    {formatCurrency(tongCoView)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} />
              </Table.Summary.Row>
            </Table.Summary>
          )} />
      </Card>
    </div>
  );
};

export default SoDuDauKyPage;
