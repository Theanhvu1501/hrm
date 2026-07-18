import { doiTuongService } from '@/services/doiTuongService';
import {
  SoChiTietReport,
  soChiTietTaiKhoanService,
} from '@/services/soChiTietTaiKhoanService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { AccountBookOutlined, ExportOutlined, HomeOutlined } from '@ant-design/icons';
import {
  Breadcrumb,
  Button,
  Card,
  Empty, message,
  Select,
  Space,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AccountReportBlock from './AccountReportBlock';
import ColumnChooser from './ColumnChooser';
import {
  buildAntdColumns, loadVisibleKeys, saveVisibleKeys,
} from './columnRegistry';
import { initialPeriod, parseReportParams } from './reportParams';
import { PeriodFilter, type PeriodFilterParams } from '@/components/shared/PeriodFilter';
import { FilterBar } from '@/components/common/FilterBar';
import { exportReportExcel } from '@/utils/exportReportExcel';
import { buildSoChiTietSheets } from './soChiTietExport';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';
import { filterSoChiTietReports, withColumnFilters } from './soChiTietFilter';

const SoChiTietTaiKhoanPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  // Kỳ khởi tạo tính đồng bộ từ query param để dropdown khớp dữ liệu ngay lần render đầu
  // (mở từ link drill-down → "Tùy chọn" + đúng khoảng ngày của link).
  const [initial] = useState(() => initialPeriod(searchParams.get.bind(searchParams)));
  const [accountOptions, setAccountOptions] = useState<{ value: string; label: string }[]>([]);
  const [doiTuongOptions, setDoiTuongOptions] = useState<{ value: string; label: string }[]>([]);
  const [maTaiKhoans, setMaTaiKhoans] = useState<string[]>([]);
  const [maDoiTuong, setMaDoiTuong] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs]>(initial.range);
  const [reports, setReports] = useState<SoChiTietReport[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => loadVisibleKeys());
  const contentRef = useRef<HTMLDivElement>(null);
  const [tableY, setTableY] = useState<number>(400);

  // Lọc theo cột ở header — giữ ở trang (không ở từng AccountReportBlock) để nhiều tài khoản
  // dùng chung một bộ lọc / một bộ cột ghim, và nút Xuất Excel bám theo đúng phần đang lọc.
  const { filters, filtering, filterable } = useTableColumnFilters(
    'bao-cao-so-chi-tiet-tai-khoan',
  );
  // Lọc trên report gốc rồi cộng lại "Cộng số phát sinh" / "Số dư cuối kỳ" theo dòng còn hiện.
  const viewReports = useMemo(
    () => filterSoChiTietReports(reports, filters),
    [reports, filters],
  );

  useEffect(() => {
    (async () => {
      try {
        const [accs, dts] = await Promise.all([
          taiKhoanService.getAll(),
          doiTuongService.getAll(),
        ]);
        setAccountOptions(accs.map((a) => ({ value: a.ma, label: `${a.ma} - ${a.ten}` })));
        setDoiTuongOptions(dts.map((d) => ({ value: d.ma, label: `${d.ma} - ${d.ten}` })));
      } catch (error) {
        console.error('Error loading danh mục:', error);
        message.error('Không tải được danh mục tài khoản / đối tượng');
      }
    })();
  }, []);

  // Mở từ link (vd drill-down từ báo cáo tài chính): đọc query param và tự tải.
  useEffect(() => {
    const p = parseReportParams(searchParams.get.bind(searchParams));
    if (!p.maTaiKhoan) return;

    const start = p.startDate && dayjs(p.startDate).isValid()
      ? dayjs(p.startDate)
      : dayjs().startOf('month');
    const end = p.endDate && dayjs(p.endDate).isValid()
      ? dayjs(p.endDate)
      : dayjs().endOf('month');

    // Phản ánh lựa chọn lên bộ lọc để người dùng thấy đang xem gì.
    // (`range` + kỳ trên dropdown đã khởi tạo từ chính param này qua `initialPeriod`.)
    setMaTaiKhoans([p.maTaiKhoan]);
    if (p.maDoiTuong) setMaDoiTuong(p.maDoiTuong);

    // Tải trực tiếp từ param (tránh đọc state chưa cập nhật).
    (async () => {
      setLoading(true);
      try {
        const data = await soChiTietTaiKhoanService.getReport(
          [p.maTaiKhoan as string],
          start.startOf('day').toDate(),
          end.endOf('day').toDate(),
          p.maDoiTuong,
        );
        setReports(data);
      } catch (error) {
        console.error('Error loading sổ chi tiết:', error);
        message.error('Không tải được sổ chi tiết tài khoản');
      } finally {
        setLoading(false);
      }
    })();
    // Chỉ chạy một lần lúc mount theo param ban đầu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    const from = range[0].format('DD/MM/YYYY');
    const to = range[1].format('DD/MM/YYYY');
    const sheets = buildSoChiTietSheets(viewReports ?? [], visibleKeys, from, to);
    if (sheets.length === 0) { message.warning('Không có dữ liệu để xuất'); return; }
    setExporting(true);
    try {
      await exportReportExcel(
        `So chi tiet tai khoan_${range[0].format('DDMMYYYY')}-${range[1].format('DDMMYYYY')}`,
        sheets,
      );
      message.success('Đã xuất Excel');
    } catch (e) {
      console.error('export excel error', e);
      message.error('Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  const onChangeVisible = (keys: string[]) => {
    setVisibleKeys(keys);
    saveVisibleKeys(keys);
  };

  const columns = useMemo(
    () => withColumnFilters(buildAntdColumns(visibleKeys), filterable),
    [visibleKeys, filterable],
  );
  const scrollX = useMemo(
    () => Math.max(1100, visibleKeys.length * 130),
    [visibleKeys],
  );

  // Đo chiều cao khả dụng để mỗi bảng ghim header/footer, chỉ cuộn nội dung.
  // 1 tài khoản: bảng lấp đầy phần còn lại; nhiều tài khoản: mỗi bảng cao vừa phải.
  useEffect(() => {
    const update = () => {
      const el = contentRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const avail = Math.max(window.innerHeight - top - 12, 200);
      const single = (viewReports?.length ?? 0) === 1;
      const CHROME = 40 /* dòng "Tài khoản:" */ + 64 /* 2 dòng footer */ + 20;
      setTableY(single ? Math.max(avail - CHROME, 160) : 340);
    };
    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
    };
  }, [viewReports, loading, visibleKeys]);

  const allSelected =
    accountOptions.length > 0 && maTaiKhoans.length === accountOptions.length;

  const loadReport = async () => {
    if (maTaiKhoans.length === 0 || !range) return;
    setLoading(true);
    try {
      const data = await soChiTietTaiKhoanService.getReport(
        allSelected ? 'all' : maTaiKhoans,
        range[0].startOf('day').toDate(),
        range[1].endOf('day').toDate(),
        maDoiTuong,
      );
      setReports(data);
    } catch (error) {
      console.error('Error loading sổ chi tiết:', error);
      message.error('Không tải được sổ chi tiết tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="sct-compact"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Breadcrumb
        style={{ marginBottom: 8 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          { title: 'Báo cáo' },
          { title: 'Sổ chi tiết tài khoản' },
        ]}
      />
      <FilterBar
        className="mb-2"
        filters={
          <>
            <PeriodFilter
              autoApply
              defaultPeriod={initial.period}
              defaultCustomRange={initial.customRange}
              onFilter={(p: PeriodFilterParams) => setRange([dayjs(p.startDate), dayjs(p.endDate)])}
            />
            <Select
              mode="multiple"
              showSearch
              placeholder="Chọn tài khoản (bắt buộc)"
              style={{ minWidth: 320, maxWidth: 520 }}
              options={accountOptions}
              value={maTaiKhoans}
              onChange={setMaTaiKhoans}
              maxTagCount="responsive"
              filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
            />
            <Button onClick={() => setMaTaiKhoans(accountOptions.map((o) => o.value))}>
              Chọn tất cả
            </Button>
            <Select
              showSearch allowClear placeholder="Đối tượng (tùy chọn)"
              style={{ width: 280 }} options={doiTuongOptions}
              value={maDoiTuong} onChange={setMaDoiTuong}
              filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
            />
            <ColumnChooser visibleKeys={visibleKeys} onChange={onChangeVisible} />
          </>
        }
        actions={
          <>
            <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
              Xuất Excel
            </Button>
            <Button type="primary" onClick={loadReport} loading={loading}>
              Xem
            </Button>
          </>
        }
      />

      <Card
        size="small"
        title={<Space size={6}><AccountBookOutlined /><span>Sổ chi tiết tài khoản</span></Space>}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        bodyStyle={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 8 }}
      >
        <div ref={contentRef}>
          {viewReports ? (
            viewReports.length === 0 ? (
              <Empty
                description={
                  filtering
                    ? 'Không có dòng nào khớp bộ lọc cột'
                    : 'Không có dữ liệu cho tài khoản và kỳ đã chọn'
                }
              />
            ) : (
              viewReports.map((rep) => (
                <AccountReportBlock
                  key={rep.taiKhoan.ma}
                  report={rep}
                  columns={loading ? [] : columns}
                  visibleKeys={visibleKeys}
                  scrollX={scrollX}
                  scrollY={tableY}
                />
              ))
            )
          ) : (
            <Empty description="Chọn tài khoản và kỳ rồi bấm Xem" />
          )}
        </div>
      </Card>
      <style>{`.sct-summary-row { background:#fafafa; font-weight:600; }`}</style>
    </div>
  );
};

export default SoChiTietTaiKhoanPage;
