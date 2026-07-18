import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Tabs,
  Breadcrumb,
  Tag,
  Alert,
  Typography,
  message,
} from 'antd';
import {
  ExportOutlined,
  HomeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
  BankOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  soCaiService,
  TrialBalance,
  SoCaiStats,
} from '@/services/soCaiService';
import {
  balanceSheetService,
  BalanceSheetData,
  BalanceSheetItem,
  BalanceSheetStats,
} from '@/services/balanceSheetService';
import { pnlService, PnLComparisonData } from '@/services/pnlService';
import { PeriodFilter, PeriodFilterParams, defaultYearParams } from '@/components/shared/PeriodFilter';
import { ExpandCollapseButtons } from "@/components/common/ExpandCollapseButtons";
import { kqkdService, KqkdReport } from '@/services/kqkdService';
import { KqkdTable } from '@/pages/bao-cao/kqkd/components/KqkdTable';
import { usePagePermission } from "@/hooks/usePagePermission";
import { taiKhoanService } from '@/services/taiKhoanService';
import { buildAccountTree, collectParentKeys, attachDoiTuongChildren, type TreeNode } from './utils/buildAccountTree';
import { buildSoChiTietUrl } from './utils/soChiTietLink';
import { exportReportExcel } from '@/utils/exportReportExcel';
import { buildTaiChinhSheets } from './taiChinhExport';

// ============ TYPES ============

interface TrialBalanceState {
  trialBalance: TrialBalance[];
  soCaiStats: SoCaiStats | null;
}

interface BalanceSheetState {
  data: BalanceSheetData | null;
  stats: BalanceSheetStats | null;
}

// ============ HELPERS ============

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(value);

const formatCurrencyShort = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} tr`;
  return formatCurrency(value);
};

// Nhãn dòng đối tượng. Ngân hàng/quỹ (có soTaiKhoan) hiện "Tên tài khoản - Số TK"
// (tên tài khoản lấy từ danh mục ngân hàng); đối tượng thường hiện "mã - tên".
const doiTuongLabel = (dt: {
  ma?: string;
  ten: string;
  soTaiKhoan?: string;
  tenNganHang?: string;
  tenTaiKhoanNH?: string;
}): string => {
  if (dt.soTaiKhoan) {
    const ten = dt.tenTaiKhoanNH || dt.ten || dt.tenNganHang;
    return `${ten} - ${dt.soTaiKhoan}`;
  }
  return dt.ma ? `${dt.ma} - ${dt.ten}` : dt.ten;
};

const CurrencyCell: React.FC<{ value: number; bold?: boolean }> = ({ value, bold }) => (
  <span
    style={{
      color: value < 0 ? '#ff4d4f' : value > 0 ? '#52c41a' : 'inherit',
      fontWeight: bold ? 600 : 400,
    }}
  >
    {value !== 0 ? formatCurrency(value) : '-'}
  </span>
);

const getPeriodLabel = (params: PeriodFilterParams): string => {
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  switch (params.periodType) {
    case 'thang':
      return `Tháng ${start.getMonth() + 1}/${start.getFullYear()}`;
    case 'quy': {
      const q = Math.floor(start.getMonth() / 3) + 1;
      return `Quý ${q}/${start.getFullYear()}`;
    }
    case 'nam':
      return `Năm ${start.getFullYear()}`;
    case 'tuyChon':
      return `${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`;
  }
};

// ============ MAIN COMPONENT ============

const BaoCaoTaiChinhPage: React.FC = () => {
  const { canExport } = usePagePermission("/bao-cao/tai-chinh");
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [filterParams, setFilterParams] = useState<PeriodFilterParams>(() => defaultYearParams());

  const [tbState, setTbState] = useState<TrialBalanceState>({
    trialBalance: [],
    soCaiStats: null,
  });

  const [bsState, setBsState] = useState<BalanceSheetState>({
    data: null,
    stats: null,
  });

  const [kqkdData, setKqkdData] = useState<KqkdReport | null>(null);
  const [pnlComparison, setPnlComparison] = useState<PnLComparisonData | null>(null);

  const [accounts, setAccounts] = useState<{ ma: string; ten: string }[]>([]);
  const [tbExpanded, setTbExpanded] = useState<React.Key[]>([]);
  const [bsTaiSanExpanded, setBsTaiSanExpanded] = useState<React.Key[]>([]);
  const [bsNguonVonExpanded, setBsNguonVonExpanded] = useState<React.Key[]>([]);

  // Dynamic heights based on actual DOM measurements
  const [tabContentHeight, setTabContentHeight] = useState<number>(500);
  const [antTableScrollY, setAntTableScrollY] = useState<number>(400);

  useEffect(() => {
    const update = () => {
      const pane = document.querySelector('.ant-tabs-tabpane-active') as HTMLElement;
      if (!pane) return;
      const paneTop = pane.getBoundingClientRect().top;
      const avail = Math.max(window.innerHeight - paneTop - 8, 160);
      setTabContentHeight(avail);

      // Chiều cao vùng cuộn của bảng (scroll.y) phải đo từ ĐÁY HEADER thực tế
      // của bảng đang hiển thị — không phải từ top của pane — để cộng đúng phần
      // toolbar (nút "Mở tất cả/Thu gọn") nằm phía trên bảng. Trước đây dùng
      // magic-number (avail - 96) bỏ qua toolbar nên bảng tràn xuống dưới và
      // dòng "Tổng cộng" (summary fixed) bị cắt ở góc dưới.
      const thead = pane.querySelector('.ant-table-thead') as HTMLElement | null;
      const headerBottom = thead
        ? thead.getBoundingClientRect().bottom
        : paneTop + 40;
      const SUMMARY_H = 40; // dòng "Tổng cộng" fixed
      const MARGIN = 16; // lề + thanh cuộn ngang
      setAntTableScrollY(
        Math.max(window.innerHeight - headerBottom - SUMMARY_H - MARGIN, 120),
      );
    };
    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', update); };
  }, [activeTab, loading]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate, periodType } = filterParams;
      const [trial, stats, bsData, bsStats, kqkd, pnlComp, accs] = await Promise.all([
        soCaiService.getTrialBalance(startDate, endDate),
        soCaiService.getStats(startDate, endDate),
        balanceSheetService.getData(endDate),
        balanceSheetService.getStats(endDate),
        kqkdService.getData({ startDate, endDate, periodType }),
        pnlService.getComparison(startDate, endDate, periodType),
        taiKhoanService.getHierarchy().catch(() => [] as { ma: string; ten: string }[]),
      ]);
      setTbState({ trialBalance: trial, soCaiStats: stats });
      setBsState({ data: bsData, stats: bsStats });
      setKqkdData(kqkd);
      setPnlComparison(pnlComp);
      setAccounts(accs.map((a) => ({ ma: a.ma, ten: a.ten })));
      setTbExpanded([]);
      setBsTaiSanExpanded([]);
      setBsNguonVonExpanded([]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilter = (params: PeriodFilterParams) => {
    setFilterParams(params);
  };

  // ============ DASHBOARD STATS ============

  const doanhThu = kqkdData?.chiTieu.find((c) => c.ma === '10')?.kyHienTai
    ?? pnlComparison?.tongDoanhThu ?? 0;

  const loiNhuanSauThue = kqkdData?.chiTieu.find((c) => c.ma === '60')?.kyHienTai ?? (() => {
    if (!pnlComparison) return 0;
    const lntt = pnlComparison.loiNhuan;
    const thue = lntt > 0 ? lntt * 0.2 : 0;
    return lntt - thue;
  })();

  // ============ TAB 1: CÂN ĐỐI TÀI KHOẢN ============

  const trialBalanceTree = useMemo(() => {
    const tree = buildAccountTree(
      tbState.trialBalance,
      accounts,
      (r) => r.taiKhoan,
      ['soDuDauKyNo', 'soDuDauKyCo', 'phatSinhNo', 'phatSinhCo', 'soDuCuoiKyNo', 'soDuCuoiKyCo'],
      (acc) => ({
        taiKhoan: acc.ma,
        tenTaiKhoan: acc.ten,
        soDuDauKyNo: 0,
        soDuDauKyCo: 0,
        phatSinhNo: 0,
        phatSinhCo: 0,
        soDuCuoiKyNo: 0,
        soDuCuoiKyCo: 0,
      }),
    );

    const childrenByCode = new Map<string, TreeNode<TrialBalance>[]>();
    for (const row of tbState.trialBalance) {
      if (!row.doiTuongChiTiet?.length) continue;
      const kids = row.doiTuongChiTiet.map((dt): TreeNode<TrialBalance> => ({
        ...dt,
        taiKhoan: '',
        tenTaiKhoan: doiTuongLabel({
          ma: dt.taiKhoan,
          ten: dt.tenTaiKhoan,
          soTaiKhoan: dt.soTaiKhoan,
          tenNganHang: dt.tenNganHang,
          tenTaiKhoanNH: dt.tenTaiKhoanNH,
        }),
        __ma: `${row.taiKhoan}::${dt.taiKhoan || '__none__'}`,
        __isParent: false,
        __isDoiTuong: true,
        __rollup: {},
      }));
      childrenByCode.set(row.taiKhoan, kids);
    }
    attachDoiTuongChildren(tree, childrenByCode);

    return tree;
  }, [tbState.trialBalance, accounts]);

  const buildBsTree = useCallback(
    (items: BalanceSheetItem[]): TreeNode<BalanceSheetItem>[] => {
      const result: TreeNode<BalanceSheetItem>[] = [];
      let i = 0;
      while (i < items.length) {
        const item = items[i];
        if (item.isSection) {
          result.push({
            ...item,
            __ma: item.ma,
            __isParent: false,
            __rollup: {} as Record<string, number>,
          } as TreeNode<BalanceSheetItem>);
          const leaves: BalanceSheetItem[] = [];
          i++;
          while (i < items.length && !items[i].isSection) {
            leaves.push(items[i]);
            i++;
          }
          const tree = buildAccountTree(
            leaves,
            accounts,
            (r) => r.ma,
            ['dauNam', 'cuoiKy'],
            (acc) => ({
              ma: acc.ma,
              tenChiTieu: `${acc.ma} - ${acc.ten}`,
              dauNam: 0,
              cuoiKy: 0,
              level: 1,
            }),
          );
          const bsChildrenByCode = new Map<string, TreeNode<BalanceSheetItem>[]>();
          for (const leaf of leaves) {
            if (!leaf.doiTuongChiTiet?.length) continue;
            const kids = leaf.doiTuongChiTiet.map((dt): TreeNode<BalanceSheetItem> => ({
              ma: '',
              tenChiTieu: doiTuongLabel(dt),
              dauNam: 0,
              cuoiKy: dt.soTien,
              level: 2,
              __ma: `${leaf.ma}::${dt.ma || '__none__'}`,
              __isParent: false,
              __isDoiTuong: true,
              __rollup: {},
            }));
            bsChildrenByCode.set(leaf.ma, kids);
          }
          attachDoiTuongChildren(tree, bsChildrenByCode);

          result.push(...tree);
        } else {
          result.push({
            ...item,
            __ma: item.ma,
            __isParent: false,
            __rollup: {} as Record<string, number>,
          } as TreeNode<BalanceSheetItem>);
          i++;
        }
      }
      return result;
    },
    [accounts],
  );

  const taiSanTree = useMemo(
    () => (bsState.data ? buildBsTree(bsState.data.taiSan) : []),
    [bsState.data, buildBsTree],
  );
  const nguonVonTree = useMemo(
    () => (bsState.data ? buildBsTree(bsState.data.nguonVon) : []),
    [bsState.data, buildBsTree],
  );

  type TrialBalanceAmountField = 'soDuDauKyNo' | 'soDuDauKyCo' | 'phatSinhNo' | 'phatSinhCo' | 'soDuCuoiKyNo' | 'soDuCuoiKyCo';

  // Số hiển thị 1 dòng:
  // - TK lá không có chi tiết đối tượng: số của chính TK (bù trừ Nợ/Có).
  // - TK có TK con: Σ TK con + phần hạch toán thẳng vào chính TK cha.
  // - TK có chi tiết đối tượng: BE đã trả Σ các dòng đối tượng (__rollup = 0 vì
  //   đối tượng là phân rã của TK, không phải TK con) → chỉ lấy số của TK.
  const renderTrialAmount = (record: TreeNode<TrialBalance>, field: TrialBalanceAmountField) => {
    const ownVal = Number(record[field]) || 0;
    const total = record.__isParent ? ownVal + (record.__rollup[field] ?? 0) : ownVal;
    return <CurrencyCell value={total} bold={record.__isParent} />;
  };

  // Mở Sổ chi tiết (tab mới): TK cho dòng tài khoản, TK cha + đối tượng cho dòng
  // đối tượng (__ma = "TKcha::đốitượng"). Dòng "Chưa xác định đối tượng" (đối
  // tượng rỗng, __ma = "TKcha::__none__") truyền tín hiệu '__none__' để Sổ chi
  // tiết chỉ hiện các bút toán CHƯA gắn đối tượng của TK đó.
  const openSoChiTietFor = (
    taiKhoan: string,
    maRow: string | undefined,
    isDoiTuong: boolean | undefined,
  ) => {
    let maTaiKhoan = taiKhoan;
    let maDoiTuong: string | undefined;
    if (isDoiTuong) {
      const [parentTK, dt] = (maRow ?? '').split('::');
      maTaiKhoan = parentTK;
      maDoiTuong = dt && dt !== '__none__' ? dt : '__none__';
    }
    if (!maTaiKhoan) return;
    const url = buildSoChiTietUrl({
      maTaiKhoan,
      maDoiTuong,
      startDate: filterParams.startDate,
      endDate: filterParams.endDate,
    });
    window.open(url, '_blank', 'noopener');
  };

  const openSoChiTiet = (record: TreeNode<TrialBalance>) =>
    openSoChiTietFor(record.taiKhoan, record.__ma, record.__isDoiTuong);

  // Mở/thu toàn bộ cây theo tab đang xem (dùng cho nút trên hàng tab).
  const handleExpandAll = () => {
    if (activeTab === '1') setTbExpanded(collectParentKeys(trialBalanceTree));
    else if (activeTab === '2') {
      setBsTaiSanExpanded(collectParentKeys(taiSanTree));
      setBsNguonVonExpanded(collectParentKeys(nguonVonTree));
    }
  };
  const handleCollapseAll = () => {
    if (activeTab === '1') setTbExpanded([]);
    else if (activeTab === '2') {
      setBsTaiSanExpanded([]);
      setBsNguonVonExpanded([]);
    }
  };

  const trialBalanceColumns: ColumnsType<TreeNode<TrialBalance>> = [
    {
      title: 'Tài khoản', dataIndex: 'taiKhoan', key: 'taiKhoan', width: 100, fixed: 'left',
      render: (text: string, record: TreeNode<TrialBalance>) =>
        text
          ? <Typography.Link onClick={() => openSoChiTiet(record)}>{text}</Typography.Link>
          : text,
    },
    {
      title: 'Tên tài khoản', dataIndex: 'tenTaiKhoan', key: 'tenTaiKhoan', width: 250, fixed: 'left',
      render: (text: string, record: TreeNode<TrialBalance>) => (
        <Typography.Link onClick={() => openSoChiTiet(record)}>{text}</Typography.Link>
      ),
    },
    {
      title: 'Số dư đầu kỳ',
      children: [
        { title: 'Nợ', dataIndex: 'soDuDauKyNo', key: 'soDuDauKyNo', width: 180, align: 'right' as const, render: (_: number, r: TreeNode<TrialBalance>) => renderTrialAmount(r, 'soDuDauKyNo') },
        { title: 'Có', dataIndex: 'soDuDauKyCo', key: 'soDuDauKyCo', width: 180, align: 'right' as const, render: (_: number, r: TreeNode<TrialBalance>) => renderTrialAmount(r, 'soDuDauKyCo') },
      ],
    },
    {
      title: 'Phát sinh trong kỳ',
      children: [
        { title: 'Nợ', dataIndex: 'phatSinhNo', key: 'phatSinhNo', width: 180, align: 'right' as const, render: (_: number, r: TreeNode<TrialBalance>) => renderTrialAmount(r, 'phatSinhNo') },
        { title: 'Có', dataIndex: 'phatSinhCo', key: 'phatSinhCo', width: 180, align: 'right' as const, render: (_: number, r: TreeNode<TrialBalance>) => renderTrialAmount(r, 'phatSinhCo') },
      ],
    },
    {
      title: 'Số dư cuối kỳ',
      children: [
        { title: 'Nợ', dataIndex: 'soDuCuoiKyNo', key: 'soDuCuoiKyNo', width: 180, align: 'right' as const, render: (_: number, r: TreeNode<TrialBalance>) => renderTrialAmount(r, 'soDuCuoiKyNo') },
        { title: 'Có', dataIndex: 'soDuCuoiKyCo', key: 'soDuCuoiKyCo', width: 180, align: 'right' as const, render: (_: number, r: TreeNode<TrialBalance>) => renderTrialAmount(r, 'soDuCuoiKyCo') },
      ],
    },
  ];

  // ============ TAB 2: CÂN ĐỐI KẾ TOÁN ============

  const balanceSheetColumns: ColumnsType<TreeNode<BalanceSheetItem>> = [
    {
      title: 'Chỉ tiêu', dataIndex: 'tenChiTieu', key: 'tenChiTieu', width: 350,
      render: (text: string, record: TreeNode<BalanceSheetItem>) =>
        record.__isDoiTuong ? (
          <Typography.Link onClick={() => openSoChiTietFor('', record.__ma, true)}>{text}</Typography.Link>
        ) : (
          <span style={{ fontWeight: record.isSection ? 700 : record.isTotal || record.__isParent ? 600 : 400, color: record.isSection ? '#1890ff' : 'inherit' }}>{text}</span>
        ),
    },
    { title: 'Mã số', dataIndex: 'ma', key: 'ma', width: 80, align: 'center' },
    {
      title: 'Số đầu năm', dataIndex: 'dauNam', key: 'dauNam', width: 150, align: 'right',
      render: (value: number, record: TreeNode<BalanceSheetItem>) => (
        <CurrencyCell value={record.__isParent ? (Number(value) || 0) + (record.__rollup.dauNam ?? 0) : value} bold={record.isSection || record.isTotal || record.__isParent} />
      ),
    },
    {
      title: 'Số cuối kỳ', dataIndex: 'cuoiKy', key: 'cuoiKy', width: 150, align: 'right',
      render: (value: number, record: TreeNode<BalanceSheetItem>) => (
        <CurrencyCell value={record.__isParent ? (Number(value) || 0) + (record.__rollup.cuoiKy ?? 0) : value} bold={record.isSection || record.isTotal || record.__isParent} />
      ),
    },
    {
      title: 'Chênh lệch', key: 'chenhLech', width: 130, align: 'right',
      render: (_: unknown, record: TreeNode<BalanceSheetItem>) => {
        const dauNam = record.__isParent ? (Number(record.dauNam) || 0) + (record.__rollup.dauNam ?? 0) : record.dauNam;
        const cuoiKy = record.__isParent ? (Number(record.cuoiKy) || 0) + (record.__rollup.cuoiKy ?? 0) : record.cuoiKy;
        if (dauNam === 0 && cuoiKy === 0) return '-';
        const diff = cuoiKy - dauNam;
        return (
          <Space>
            <span style={{ color: diff >= 0 ? '#52c41a' : '#ff4d4f' }}>{formatCurrencyShort(diff)}</span>
            {diff !== 0 && (diff > 0 ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />)}
          </Space>
        );
      },
    },
  ];

  // ============ TAB 4: SO SÁNH LÃI LỖ ============

  type PnLCompRow = {
    key: string;
    khoanMuc: string;
    kyHienTai: number;
    kyTruoc: number;
    bienDong: number;
    phanTramBienDong: number | null;
    isCategory?: boolean;
    isSummary?: boolean;
  };

  const buildPnLComparisonData = (): PnLCompRow[] => {
    if (!pnlComparison) return [];
    const rows: PnLCompRow[] = [];
    const prev = pnlComparison.kyTruoc;

    const makeRow = (key: string, name: string, cur: number, pre: number, opts?: { isCategory?: boolean; isSummary?: boolean }): PnLCompRow => {
      const diff = cur - pre;
      const pct = pre !== 0 ? (diff / Math.abs(pre)) * 100 : (cur !== 0 ? 100 : null);
      return { key, khoanMuc: name, kyHienTai: cur, kyTruoc: pre, bienDong: diff, phanTramBienDong: pct, ...opts };
    };

    // Doanh thu
    rows.push(makeRow('cat-dt', 'DOANH THU', pnlComparison.tongDoanhThu, prev.tongDoanhThu, { isCategory: true }));
    pnlComparison.doanhThu.forEach((item, i) => {
      const prevItem = prev.doanhThu.find((p) => p.ma === item.ma);
      rows.push(makeRow(`dt-${i}`, `   ${item.ma} - ${item.ten}`, item.soTien, prevItem?.soTien ?? 0));
    });

    // Chi phí
    rows.push(makeRow('cat-cp', 'CHI PHÍ', pnlComparison.tongChiPhi, prev.tongChiPhi, { isCategory: true }));
    pnlComparison.chiPhi.forEach((item, i) => {
      const prevItem = prev.chiPhi.find((p) => p.ma === item.ma);
      rows.push(makeRow(`cp-${i}`, `   ${item.ma} - ${item.ten}`, item.soTien, prevItem?.soTien ?? 0));
    });

    // Lợi nhuận
    const lnttCur = pnlComparison.loiNhuan;
    const lnttPrev = prev.loiNhuan;
    rows.push(makeRow('lntt', 'LỢI NHUẬN TRƯỚC THUẾ', lnttCur, lnttPrev, { isSummary: true }));

    const thueCur = lnttCur > 0 ? lnttCur * 0.2 : 0;
    const thuePrev = lnttPrev > 0 ? lnttPrev * 0.2 : 0;
    rows.push(makeRow('thue', '   Thuế TNDN (20%)', -thueCur, -thuePrev));

    rows.push(makeRow('lnst', 'LỢI NHUẬN SAU THUẾ', lnttCur - thueCur, lnttPrev - thuePrev, { isSummary: true }));

    return rows;
  };

  const pnlCompColumns: ColumnsType<PnLCompRow> = [
    {
      title: 'Khoản mục', dataIndex: 'khoanMuc', key: 'khoanMuc', width: 350,
      render: (text: string, record: PnLCompRow) => (
        <span style={{ fontWeight: record.isCategory || record.isSummary ? 600 : 400, color: record.isSummary ? '#1890ff' : 'inherit' }}>{text}</span>
      ),
    },
    {
      title: 'Kỳ hiện tại', dataIndex: 'kyHienTai', key: 'kyHienTai', width: 160, align: 'right',
      render: (v: number, r: PnLCompRow) => <CurrencyCell value={v} bold={r.isCategory || r.isSummary} />,
    },
    {
      title: 'Kỳ trước', dataIndex: 'kyTruoc', key: 'kyTruoc', width: 160, align: 'right',
      render: (v: number, r: PnLCompRow) => <CurrencyCell value={v} bold={r.isCategory || r.isSummary} />,
    },
    {
      title: 'Biến động', dataIndex: 'bienDong', key: 'bienDong', width: 150, align: 'right',
      render: (v: number) => (
        <Space>
          <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{formatCurrencyShort(v)}</span>
          {v !== 0 && (v > 0 ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />)}
        </Space>
      ),
    },
    {
      title: '% Biến động', dataIndex: 'phanTramBienDong', key: 'phanTramBienDong', width: 120, align: 'right',
      render: (v: number | null) => {
        if (v === null) return '-';
        return <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{v >= 0 ? '+' : ''}{v.toFixed(1)}%</span>;
      },
    },
  ];

  // ============ EXPORT EXCEL ============

  const handleExport = async () => {
    const sheets = buildTaiChinhSheets(
      activeTab,
      {
        trialBalanceTree,
        trialBalance: tbState.trialBalance,
        taiSanTree,
        nguonVonTree,
        kqkdData,
        pnlComparison,
      },
      getPeriodLabel(filterParams),
    );
    if (sheets.length === 0) {
      message.warning('Tab này không có bảng để xuất');
      return;
    }
    setExporting(true);
    try {
      await exportReportExcel('Bao cao tai chinh', sheets);
      message.success('Đã xuất Excel');
    } catch (e) {
      console.error('export excel error', e);
      message.error('Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  // ============ RENDER ============

  const tabBarExtra = (
    <Space size={4} wrap style={{ justifyContent: 'flex-end' }}>
      <PeriodFilter onFilter={handleFilter} loading={loading} autoApply />
      {(activeTab === '1' || activeTab === '2') && (
        <ExpandCollapseButtons onExpandAll={handleExpandAll} onCollapseAll={handleCollapseAll} />
      )}
      <Button size="small" icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>Xuất Excel</Button>
    </Space>
  );

  return (
    <div className="bctc-compact" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> Trang chủ</> },
              { title: 'Báo cáo' },
              { title: 'Báo cáo tài chính' },
            ]}
          />
          <Tag color="blue">{getPeriodLabel(filterParams)}</Tag>
        </div>

        <Row gutter={8} style={{ marginBottom: 4 }}>
        <Col span={6}>
          <Card className="stat-card" size="small" bodyStyle={{ padding: '4px 12px' }}>
            <Statistic title="Tổng tài sản" value={bsState.stats?.tongTaiSan ?? 0} formatter={(val) => formatCurrencyShort(val as number)} prefix={<BankOutlined style={{ color: '#1890ff' }} />} valueStyle={{ fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card stat-card-success" size="small" bodyStyle={{ padding: '4px 12px' }}>
            <Statistic title="Doanh thu" value={doanhThu} formatter={(val) => formatCurrencyShort(val as number)} prefix={<DollarOutlined style={{ color: '#52c41a' }} />} valueStyle={{ fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card stat-card-success" size="small" bodyStyle={{ padding: '4px 12px' }}>
            <Statistic
              title="Lợi nhuận sau thuế"
              value={loiNhuanSauThue}
              formatter={(val) => formatCurrencyShort(val as number)}
              valueStyle={{ color: loiNhuanSauThue >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 16 }}
              prefix={loiNhuanSauThue >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card stat-card-warning" size="small" bodyStyle={{ padding: '4px 12px' }}>
            <Statistic
              title="Cân đối phát sinh"
              value={tbState.soCaiStats?.canDoi ? 'Cân đối' : 'Lệch'}
              valueStyle={{ color: tbState.soCaiStats?.canDoi ? '#52c41a' : '#ff4d4f', fontSize: 16 }}
              prefix={tbState.soCaiStats?.canDoi ? <CheckCircleOutlined /> : <WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>
      </div>

      <Card size="small" bodyStyle={{ padding: '0 8px 8px' }} style={{ flex: 1, overflow: 'hidden' }}>

        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" tabBarExtraContent={{ right: tabBarExtra }} items={[
          {
            key: '1',
            label: 'Cân đối tài khoản',
            children: (
              <>
                {tbState.soCaiStats && !tbState.soCaiStats.canDoi && (
                  <Alert message="Cảnh báo: Tổng phát sinh Nợ và Có không cân đối!" type="warning" showIcon style={{ marginBottom: 8 }} />
                )}
                <Table<TreeNode<TrialBalance>>
                  className="excel-table tb-summary"
                  columns={trialBalanceColumns}
                  dataSource={trialBalanceTree}
                  rowKey="__ma"
                  expandable={{
                    expandedRowKeys: tbExpanded,
                    onExpandedRowsChange: (keys) => setTbExpanded([...keys]),
                  }}
                  loading={loading}
                  bordered
                  size="small"
                  scroll={{ x: 1480, y: antTableScrollY }}
                  pagination={false}
                  summary={() => {
                    const totals = tbState.trialBalance.reduce(
                      (acc, row) => ({
                        soDuDauKyNo: acc.soDuDauKyNo + row.soDuDauKyNo,
                        soDuDauKyCo: acc.soDuDauKyCo + row.soDuDauKyCo,
                        phatSinhNo: acc.phatSinhNo + row.phatSinhNo,
                        phatSinhCo: acc.phatSinhCo + row.phatSinhCo,
                        soDuCuoiKyNo: acc.soDuCuoiKyNo + row.soDuCuoiKyNo,
                        soDuCuoiKyCo: acc.soDuCuoiKyCo + row.soDuCuoiKyCo,
                      }),
                      { soDuDauKyNo: 0, soDuDauKyCo: 0, phatSinhNo: 0, phatSinhCo: 0, soDuCuoiKyNo: 0, soDuCuoiKyCo: 0 },
                    );
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row style={{ fontWeight: 700, background: '#fafafa' }}>
                          <Table.Summary.Cell index={0} colSpan={2}>Tổng cộng</Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">{formatCurrency(totals.soDuDauKyNo)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">{formatCurrency(totals.soDuDauKyCo)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">{formatCurrency(totals.phatSinhNo)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">{formatCurrency(totals.phatSinhCo)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right">{formatCurrency(totals.soDuCuoiKyNo)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={7} align="right">{formatCurrency(totals.soDuCuoiKyCo)}</Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                />
              </>
            ),
          },
          {
            key: '2',
            label: 'Cân đối kế toán',
            children: bsState.data ? (
              <div style={{ maxHeight: tabContentHeight, overflow: 'auto' }}>
                {!bsState.data.canDoi && (
                  <Alert message="Cảnh báo: Tổng tài sản và Tổng nguồn vốn không cân đối!" type="warning" showIcon style={{ marginBottom: 16 }} />
                )}
                <Card title="TÀI SẢN" size="small" style={{ marginBottom: 12 }}>
                  <Table<TreeNode<BalanceSheetItem>>
                    className="excel-table"
                    columns={balanceSheetColumns}
                    dataSource={taiSanTree}
                    rowKey="__ma"
                    loading={loading}
                    bordered
                    size="small"
                    pagination={false}
                    expandable={{ expandedRowKeys: bsTaiSanExpanded, onExpandedRowsChange: (keys) => setBsTaiSanExpanded([...keys]) }}
                  />
                </Card>
                <Card title="NGUỒN VỐN" size="small">
                  <Table<TreeNode<BalanceSheetItem>>
                    className="excel-table"
                    columns={balanceSheetColumns}
                    dataSource={nguonVonTree}
                    rowKey="__ma"
                    loading={loading}
                    bordered
                    size="small"
                    pagination={false}
                    expandable={{ expandedRowKeys: bsNguonVonExpanded, onExpandedRowsChange: (keys) => setBsNguonVonExpanded([...keys]) }}
                  />
                </Card>
              </div>
            ) : null,
          },
          {
            key: '3',
            label: 'Kết quả kinh doanh',
            children: (
              <div style={{ maxHeight: tabContentHeight, overflow: 'auto' }}>
                <KqkdTable data={kqkdData?.chiTieu ?? []} loading={loading} />
              </div>
            ),
          },
          {
            key: '4',
            label: 'So sánh lãi lỗ',
            children: (
              <Table
                className="excel-table"
                columns={pnlCompColumns}
                dataSource={buildPnLComparisonData()}
                rowKey="key"
                loading={loading}
                bordered
                size="small"
                scroll={{ y: antTableScrollY }}
                pagination={false}
                rowClassName={(record) => record.isSummary ? 'ant-table-row-summary' : record.isCategory ? 'ant-table-row-category' : ''}
              />
            ),
          },
        ]} />
      </Card>
    </div>
  );
};

export default BaoCaoTaiChinhPage;
