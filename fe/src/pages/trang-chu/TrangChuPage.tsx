import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Button, Card, Skeleton, Tooltip, Typography } from "antd";
import {
  DashboardOutlined,
  ReloadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  PauseCircleOutlined,
  SolutionOutlined,
  FileExclamationOutlined,
  FileDoneOutlined,
} from "@ant-design/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/contexts/AuthContext";
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
import { employeeService } from "@/services/employeeService";
import { laborContractService } from "@/services/laborContractService";
import { attendanceRequestService, type AttendanceRequest } from "@/services/attendanceRequestService";
import { resignationService } from "@/services/resignationService";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { StatusPill } from "@/components/ui/StatusPill";
import { LOAI_HOP_DONG_OPTIONS as LOAI_HD_NHAN_VIEN, labelFor } from "@/pages/nhan-su/ho-so-nhan-vien/constants";
import { LOAI_HOP_DONG_OPTIONS as LOAI_HD } from "@/pages/nhan-su/hop-dong-lao-dong/constants";
import { LOAI_DON_OPTIONS } from "@/pages/cham-cong/don-cham-cong/constants";
import {
  NGUONG_SAP_HET_HAN,
  bienDongTheoThang,
  demTheo,
  hopDongSapHetHan,
  tinhChiSo,
  type HopDongSapHet,
} from "./tongQuan";

const { Text } = Typography;

// Màu biểu đồ dùng chung với ke-toan-so (docs/design §6). Hex vì recharts vẽ
// SVG bằng thuộc tính fill/stroke — không đọc được biến CSS trong mọi trình duyệt.
const TEAL = "#1F7769"; // = --primary
const XAM = "#6E6E7359"; // = --ink-2 ở alpha 0.35
const CAM = "#F2994A"; // = --chart-orange
const LUOI = "#8A8A8F59";
const CHU_PHU = "#6E6E73";
const BANG_MAU = ["#1F3864", "#C9A227", TEAL, CAM, "#8A8A8F"]; // navy · gold · teal · cam · xám

const ngayVN = (s?: string) => (s ? dayjs(s).format("DD/MM/YYYY") : "-");

/** Thẻ số liệu — cùng khuôn KpiRow của ke-toan-so (vạch màu trái, nhãn hoa, số lớn, ô icon). */
function TheChiSo({
  nhan,
  giaTri,
  icon,
  canhBao,
  goiY,
  loading,
  onClick,
}: {
  nhan: string;
  /** null = không có quyền xem nguồn này → "—". */
  giaTri: number | null;
  icon: ReactNode;
  /** Số > 0 là tín hiệu cần xử lý (tô cam). */
  canhBao?: boolean;
  goiY?: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  const nong = canhBao && !!giaTri;
  return (
    <Card
      className={`stat-card h-full ${nong ? "stat-card-warning" : ""}`}
      hoverable={!!onClick}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Tooltip title={goiY}>
            <Text className="block truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
              {nhan}
            </Text>
          </Tooltip>
          {loading ? (
            <Skeleton.Input active size="small" style={{ width: "70%", marginTop: 8 }} />
          ) : (
            <div
              className={`mt-1 truncate text-lg font-bold tabular-nums sm:mt-2 sm:text-2xl ${
                giaTri === null ? "text-muted-foreground" : nong ? "text-[hsl(var(--amber))]" : "text-foreground"
              }`}
            >
              {giaTri === null ? "—" : giaTri.toLocaleString("vi-VN")}
            </div>
          )}
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-primary/10 text-base text-primary sm:h-12 sm:w-12 sm:text-xl">
          {icon}
        </div>
      </div>
    </Card>
  );
}

const TieuDeThe = ({ children }: { children: ReactNode }) => (
  <span className="text-sm font-semibold uppercase sm:text-base">{children}</span>
);

const KhongCoQuyen = ({ cao = 260 }: { cao?: number }) => (
  <div
    className="flex items-center justify-center text-[11px] text-muted-foreground"
    style={{ height: cao }}
  >
    Bạn chưa được cấp quyền xem dữ liệu này
  </div>
);

const TrongTron = ({ cao = 260, chu = "Chưa có dữ liệu" }: { cao?: number; chu?: string }) => (
  <div
    className="flex items-center justify-center text-[11px] text-muted-foreground"
    style={{ height: cao }}
  >
    {chu}
  </div>
);

/**
 * Trang chủ khu quản trị — tổng quan nhân sự, dựng theo khung dashboard của
 * ke-toan-so: header dính → hàng 8 thẻ số liệu → biểu đồ → bảng việc cần làm.
 *
 * Mỗi khối chỉ gọi API khi người xem có quyền xem trang nguồn của nó (cùng
 * khoá quyền với sidebar), để người chỉ có quyền Chấm công không bị 403 và
 * không thấy số liệu hồ sơ họ không được xem.
 */
export default function TrangChuPage() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { tenTheoId } = usePhongBanOptions();
  const duocXem = (route: string) => Boolean(user?.isSuperAdmin) || hasPermission(`${route}:xem`);

  const xemHoSo = duocXem("/nhan-su/ho-so-nhan-vien");
  const xemHopDong = duocXem("/nhan-su/hop-dong-lao-dong");
  const xemDon = duocXem("/cham-cong/don-tu");
  const xemThoiViec = duocXem("/nhan-su/thoi-viec");

  const qNhanVien = useQuery({ queryKey: ["trang-chu", "nhan-vien"], queryFn: () => employeeService.getList(), enabled: xemHoSo });
  const qHopDong = useQuery({ queryKey: ["trang-chu", "hop-dong"], queryFn: () => laborContractService.getList(), enabled: xemHopDong });
  const qDon = useQuery({ queryKey: ["trang-chu", "don"], queryFn: () => attendanceRequestService.getList(), enabled: xemDon });
  const qThoiViec = useQuery({ queryKey: ["trang-chu", "thoi-viec"], queryFn: () => resignationService.getList(), enabled: xemThoiViec });

  const dangTai = [qNhanVien, qHopDong, qDon, qThoiViec].some((q) => q.isFetching);
  const taiLai = () => [qNhanVien, qHopDong, qDon, qThoiViec].forEach((q) => q.refetch());

  // Nguồn không có quyền (hoặc lỗi) → undefined → chỉ số "—".
  const nhanVien = xemHoSo ? qNhanVien.data : undefined;
  const hopDong = xemHopDong ? qHopDong.data : undefined;
  const don = xemDon ? qDon.data : undefined;
  const thoiViec = xemThoiViec ? qThoiViec.data : undefined;

  const homNay = useMemo(() => dayjs(), []);
  const chiSo = useMemo(
    () => tinhChiSo({ nhanVien, hopDong, donChamCong: don, thoiViec }, homNay),
    [nhanVien, hopDong, don, thoiViec, homNay],
  );
  const bienDong = useMemo(
    () => (nhanVien ? bienDongTheoThang(nhanVien, thoiViec, homNay) : []),
    [nhanVien, thoiViec, homNay],
  );
  const conLam = useMemo(() => (nhanVien ?? []).filter((e) => e.trangThai !== "da_nghi"), [nhanVien]);
  const theoPhongBan = useMemo(
    () => demTheo(conLam, (e) => (e.departmentId ? tenTheoId(e.departmentId) : "")).slice(0, 8),
    [conLam, tenTheoId],
  );
  const theoLoaiHd = useMemo(
    () => demTheo(conLam, (e) => labelFor(LOAI_HD_NHAN_VIEN, e.loaiHopDong)),
    [conLam],
  );
  const sapHet = useMemo(() => (hopDong ? hopDongSapHetHan(hopDong, homNay) : []), [hopDong, homNay]);
  const donCho = useMemo(
    () => (don ?? []).filter((d) => d.trangThai === "cho_duyet").sort((a, b) => a.ngay.localeCompare(b.ngay)),
    [don],
  );

  const tongVao = bienDong.reduce((s, d) => s + d.vao, 0);
  const tongRa = bienDong.reduce((s, d) => s - d.ra, 0);
  const coBienDong = bienDong.some((d) => d.vao || d.ra || d.tong);

  const cotHopDong: ColumnsType<HopDongSapHet> = [
    {
      title: "Số HĐ",
      key: "so",
      width: 120,
      render: (_, r) => (
        <Text strong className="text-primary">
          {r.hopDong.contractNo}
        </Text>
      ),
    },
    {
      title: "Nhân viên",
      key: "nv",
      ellipsis: true,
      render: (_, r) => (
        <div className="min-w-0">
          <div className="truncate">{r.hopDong.employeeName || "-"}</div>
          {r.hopDong.employeeCode && <div className="text-[10.5px] text-muted-foreground">{r.hopDong.employeeCode}</div>}
        </div>
      ),
    },
    { title: "Loại HĐ", key: "loai", width: 150, render: (_, r) => labelFor(LOAI_HD, r.hopDong.loaiHopDong) },
    { title: "Ngày hết hạn", key: "het", width: 100, render: (_, r) => ngayVN(r.hopDong.ngayKetThuc) },
    {
      title: "Còn lại",
      key: "con",
      width: 110,
      align: "center",
      render: (_, r) =>
        r.conLai < 0 ? (
          <StatusPill tone="tu-choi">Quá hạn {-r.conLai} ngày</StatusPill>
        ) : (
          <StatusPill tone={r.conLai <= 7 ? "tu-choi" : "cho"}>
            {r.conLai === 0 ? "Hết hạn hôm nay" : `${r.conLai} ngày`}
          </StatusPill>
        ),
    },
  ];

  const cotDon: ColumnsType<AttendanceRequest> = [
    {
      title: "Nhân viên",
      key: "nv",
      ellipsis: true,
      render: (_, d) => (
        <div className="min-w-0">
          <div className="truncate">{d.employeeName || "-"}</div>
          {d.employeeCode && <div className="text-[10.5px] text-muted-foreground">{d.employeeCode}</div>}
        </div>
      ),
    },
    { title: "Loại đơn", key: "loai", width: 110, render: (_, d) => labelFor(LOAI_DON_OPTIONS, d.loaiDon) },
    {
      title: "Ngày",
      key: "ngay",
      width: 150,
      render: (_, d) => (d.denNgay && d.denNgay !== d.ngay ? `${ngayVN(d.ngay)} – ${ngayVN(d.denNgay)}` : ngayVN(d.ngay)),
    },
    { title: "Lý do", dataIndex: "lyDo", key: "lyDo", ellipsis: true, render: (v?: string) => v || "-" },
  ];

  return (
    <div className="space-y-3">
      {/* Header dính — cùng khuôn Tổng quan báo cáo của ke-toan-so. */}
      <div
        className="sticky z-20 flex flex-wrap items-center justify-between gap-2"
        style={{
          top: 0,
          marginInline: -12,
          marginTop: -12,
          padding: "10px 12px",
          background: "hsl(var(--background))",
          borderBottom: "1px solid hsl(var(--border))",
        }}
      >
        <div className="flex items-center gap-2">
          <DashboardOutlined className="text-primary" />
          <Text strong className="text-sm sm:text-base">
            Tổng quan nhân sự
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Hôm nay {homNay.format("DD/MM/YYYY")}</span>
          <Tooltip title="Tải lại số liệu">
            <Button icon={<ReloadOutlined />} loading={dangTai} onClick={taiLai} />
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TheChiSo nhan="Tổng nhân sự" giaTri={chiSo.tongNhanSu} icon={<TeamOutlined />} loading={xemHoSo && qNhanVien.isLoading}
          goiY="Hồ sơ chưa ở trạng thái Đã nghỉ" onClick={xemHoSo ? () => navigate("/nhan-su/ho-so-nhan-vien") : undefined} />
        <TheChiSo nhan="Đang làm việc" giaTri={chiSo.dangLamViec} icon={<CheckCircleOutlined />} loading={xemHoSo && qNhanVien.isLoading} />
        <TheChiSo nhan="Thử việc" giaTri={chiSo.thuViec} icon={<SolutionOutlined />} loading={xemHoSo && qNhanVien.isLoading} />
        <TheChiSo nhan="Tạm nghỉ" giaTri={chiSo.tamNghi} icon={<PauseCircleOutlined />} loading={xemHoSo && qNhanVien.isLoading} />
        <TheChiSo nhan={`Vào làm T${homNay.month() + 1}`} giaTri={chiSo.vaoTrongThang} icon={<UserAddOutlined />}
          loading={xemHoSo && qNhanVien.isLoading} goiY="Hồ sơ có ngày vào làm trong tháng này" />
        <TheChiSo nhan={`Nghỉ việc T${homNay.month() + 1}`} giaTri={chiSo.nghiTrongThang} icon={<UserDeleteOutlined />}
          loading={xemThoiViec && qThoiViec.isLoading} goiY="Đơn thôi việc đã hoàn thành, ngày làm việc cuối trong tháng này"
          onClick={xemThoiViec ? () => navigate("/nhan-su/thoi-viec") : undefined} />
        <TheChiSo nhan="HĐ sắp hết hạn" giaTri={chiSo.hopDongSapHetHan} icon={<FileExclamationOutlined />} canhBao
          loading={xemHopDong && qHopDong.isLoading} goiY={`Hợp đồng đang hiệu lực còn ≤ ${NGUONG_SAP_HET_HAN} ngày (gồm cả đã quá hạn)`}
          onClick={xemHopDong ? () => navigate("/nhan-su/hop-dong-lao-dong") : undefined} />
        <TheChiSo nhan="Đơn chờ duyệt" giaTri={chiSo.donChoDuyet} icon={<FileDoneOutlined />} canhBao
          loading={xemDon && qDon.isLoading} goiY="Đơn chấm công đang chờ duyệt"
          onClick={xemDon ? () => navigate("/cham-cong/don-tu") : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2" title={<TieuDeThe>Biến động nhân sự</TieuDeThe>}>
          {!xemHoSo ? (
            <KhongCoQuyen cao={280} />
          ) : qNhanVien.isLoading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : !coBienDong ? (
            <TrongTron cao={280} />
          ) : (
            <>
              <div className="mb-2 grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold sm:text-2xl" style={{ color: TEAL }}>{tongVao}</div>
                  <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">Vào · 12 tháng</div>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold text-muted-foreground sm:text-2xl">{tongRa}</div>
                  <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">Ra · 12 tháng</div>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold sm:text-2xl" style={{ color: CAM }}>{bienDong[bienDong.length - 1]?.tong ?? 0}</div>
                  <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">Quy mô hiện tại</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={bienDong} margin={{ left: -18, right: 8, top: 16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={LUOI} />
                  <XAxis dataKey="thang" stroke={CHU_PHU} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="bd" stroke={CHU_PHU} tick={{ fontSize: 11 }} allowDecimals={false} width={40} />
                  <YAxis yAxisId="tong" orientation="right" stroke={CHU_PHU} tick={{ fontSize: 11 }} allowDecimals={false} width={36} />
                  <ReferenceLine yAxisId="bd" y={0} stroke={LUOI} />
                  <ChartTooltip
                    formatter={(v: number, ten: string) => [Math.abs(v).toLocaleString("vi-VN"), ten]}
                    labelFormatter={(_, p) => (p?.[0]?.payload?.ky ? dayjs(p[0].payload.ky).format("[Tháng] M/YYYY") : "")}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  <Bar yAxisId="bd" dataKey="vao" name="Vào" fill={TEAL} maxBarSize={22}>
                    <LabelList dataKey="vao" position="top" formatter={(v: number) => (v ? v : "")} style={{ fontSize: 10, fill: TEAL }} />
                  </Bar>
                  <Bar yAxisId="bd" dataKey="ra" name="Ra" fill={XAM} maxBarSize={22}>
                    <LabelList dataKey="ra" position="bottom" formatter={(v: number) => (v ? -v : "")} style={{ fontSize: 10, fill: CHU_PHU }} />
                  </Bar>
                  <Line yAxisId="tong" type="monotone" dataKey="tong" name="Quy mô" stroke={CAM} strokeWidth={2} dot={{ r: 3, fill: CAM }} />
                </ComposedChart>
              </ResponsiveContainer>
            </>
          )}
        </Card>

        <Card title={<TieuDeThe>Cơ cấu nhân sự</TieuDeThe>}>
          {!xemHoSo ? (
            <KhongCoQuyen cao={320} />
          ) : qNhanVien.isLoading ? (
            <Skeleton active paragraph={{ rows: 7 }} />
          ) : conLam.length === 0 ? (
            <TrongTron cao={320} />
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-muted-foreground">Theo loại hợp đồng</div>
              <div className="flex items-center gap-3">
                <div className="h-[120px] w-[120px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={theoLoaiHd} dataKey="soLuong" nameKey="ten" innerRadius={34} outerRadius={56} paddingAngle={1} stroke="none">
                        {theoLoaiHd.map((_, i) => (
                          <Cell key={i} fill={BANG_MAU[i % BANG_MAU.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip formatter={(v: number, ten: string) => [v.toLocaleString("vi-VN"), ten]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  {theoLoaiHd.map((o, i) => (
                    <div key={o.ten} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: BANG_MAU[i % BANG_MAU.length] }} />
                      <span className="min-w-0 flex-1 truncate">{o.ten}</span>
                      <span className="font-semibold tabular-nums">{o.soLuong}</span>
                      <span className="w-9 text-right tabular-nums text-muted-foreground">
                        {Math.round((o.soLuong / conLam.length) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-1 text-[11px] font-semibold text-muted-foreground">Theo phòng ban</div>
              <ResponsiveContainer width="100%" height={Math.max(90, theoPhongBan.length * 22)}>
                <BarChart data={theoPhongBan} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="ten" width={110} tick={{ fontSize: 11, fill: CHU_PHU }} axisLine={false} tickLine={false} />
                  <ChartTooltip formatter={(v: number) => [v.toLocaleString("vi-VN"), "Nhân sự"]} />
                  <Bar dataKey="soLuong" fill="#1F3864" maxBarSize={12}>
                    <LabelList dataKey="soLuong" position="right" style={{ fontSize: 10, fill: CHU_PHU }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card
          title={<TieuDeThe>Hợp đồng sắp hết hạn</TieuDeThe>}
          extra={xemHopDong && <Button type="link" size="small" onClick={() => navigate("/nhan-su/hop-dong-lao-dong")}>Xem tất cả</Button>}
        >
          {!xemHopDong ? (
            <KhongCoQuyen cao={200} />
          ) : (
            <BangDuLieu<HopDongSapHet>
              columns={cotHopDong}
              dataSource={sapHet}
              rowKey={(r) => r.hopDong.id}
              loading={qHopDong.isFetching}
              pagination={false}
              scroll={{ y: 260 }}
              locale={{ emptyText: <TrongTron cao={120} chu={`Không có hợp đồng nào hết hạn trong ${NGUONG_SAP_HET_HAN} ngày tới`} /> }}
            />
          )}
        </Card>

        <Card
          title={<TieuDeThe>Đơn chờ duyệt</TieuDeThe>}
          extra={xemDon && <Button type="link" size="small" onClick={() => navigate("/cham-cong/don-tu")}>Đi tới duyệt đơn</Button>}
        >
          {!xemDon ? (
            <KhongCoQuyen cao={200} />
          ) : (
            <BangDuLieu<AttendanceRequest>
              columns={cotDon}
              dataSource={donCho}
              rowKey="id"
              loading={qDon.isFetching}
              pagination={false}
              scroll={{ y: 260 }}
              locale={{ emptyText: <TrongTron cao={120} chu="Không có đơn nào đang chờ duyệt" /> }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

