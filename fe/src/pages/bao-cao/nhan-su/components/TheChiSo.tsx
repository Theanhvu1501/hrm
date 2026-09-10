import { Tooltip } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  InfoCircleOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { chuaCoNguon, type ChiSo } from '../baoCao.types';
import { dinhDangGiaTri, tinhBienDong } from '../dinhDang';

/**
 * Một ô chỉ số.
 *
 * Hai hình thái cố ý khác hẳn nhau về sắc độ: ô CÓ số dùng nền đặc, chữ đậm;
 * ô CHƯA CÓ NGUỒN để viền đứt, nền nhạt và giá trị là dấu "—". Mục đích không
 * phải trang trí mà là để người xem phân biệt ngay "phần đã chạy được" với
 * "phần còn phải xây" — thay vì phải đọc từng chữ mới biết ô nào là số thật.
 *
 * Khung thẻ theo kiểu thẻ số liệu của ke-toan-so: nền card, viền --border,
 * bo 9px, số 19px đậm. Màu chữ lấy token --ink* nên tự đổi theo dark mode.
 */
export default function TheChiSo({ chiSo }: { chiSo: ChiSo }) {
  const { nguon } = chiSo;

  const tieuDe = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold leading-snug text-[hsl(var(--ink))]">
          {chiSo.ten}
        </div>
        {chiSo.tenEn && (
          <div className="text-[10px] italic leading-tight text-[hsl(var(--ink-3))]">
            {chiSo.tenEn}
          </div>
        )}
      </div>
      <Tooltip title={chiSo.yNghia} placement="topRight">
        <InfoCircleOutlined className="mt-0.5 shrink-0 text-[hsl(var(--ink-3))] hover:text-[hsl(var(--ink-2))]" />
      </Tooltip>
    </div>
  );

  if (chuaCoNguon(nguon)) {
    return (
      <div className="bc-the flex h-full flex-col justify-between gap-2 rounded-[9px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5">
        {tieuDe}
        <div>
          <div className="text-[19px] font-light leading-none text-[hsl(var(--ink-3))]">—</div>
          <div className="mt-1.5 text-[10.5px] font-medium uppercase tracking-wide text-[hsl(var(--ink-2))]">
            Chưa có dữ liệu
          </div>
          <div className="mt-0.5 text-[10.5px] leading-snug text-[hsl(var(--ink-2))]">
            Cần: {nguon.canGi}
          </div>
        </div>
      </div>
    );
  }

  const bienDong = tinhBienDong(nguon.giaTri, nguon.kyTruoc, chiSo.chieuTot, chiSo.donVi);

  return (
    <div className="bc-the flex h-full flex-col justify-between gap-2 rounded-[9px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2.5">
      {tieuDe}
      <div>
        <div className="text-[19px] font-bold leading-none tabular-nums text-[hsl(var(--ink))]">
          {dinhDangGiaTri(nguon.giaTri, chiSo.donVi)}
        </div>
        {bienDong && <DongBienDong bienDong={bienDong} chiSo={chiSo} />}
        <div className="mt-1 truncate text-[10px] text-[hsl(var(--ink-3))]" title={nguon.moTaNguon}>
          Nguồn: {nguon.moTaNguon}
        </div>
      </div>
    </div>
  );
}

function DongBienDong({
  bienDong,
  chiSo,
}: {
  bienDong: NonNullable<ReturnType<typeof tinhBienDong>>;
  chiSo: ChiSo;
}) {
  const { chenhLech, phanTramThayDoi, huong } = bienDong;

  // Màu theo `huong` (đã tính từ `chieuTot`) chứ KHÔNG theo dấu của chênh
  // lệch: tỷ lệ nghỉ việc giảm là tin tốt, tỷ lệ vượt thử việc giảm là tin xấu.
  const mau =
    huong === 'tot'
      ? 'text-[hsl(var(--green))]'
      : huong === 'xau'
        ? 'text-[hsl(var(--red))]'
        : 'text-[hsl(var(--ink-3))]';

  const Icon = chenhLech > 0 ? ArrowUpOutlined : chenhLech < 0 ? ArrowDownOutlined : MinusOutlined;
  const dau = chenhLech > 0 ? '+' : '';

  return (
    <div className={`mt-1.5 flex items-center gap-1 text-[10.5px] font-medium tabular-nums ${mau}`}>
      <Icon className="text-[10px]" />
      <span>
        {dau}
        {dinhDangGiaTri(chenhLech, chiSo.donVi)}
      </span>
      {phanTramThayDoi !== null && chenhLech !== 0 && (
        <span className="font-normal opacity-80">
          ({dau}
          {phanTramThayDoi.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%)
        </span>
      )}
      <span className="font-normal text-[hsl(var(--ink-3))]">so kỳ trước</span>
    </div>
  );
}
