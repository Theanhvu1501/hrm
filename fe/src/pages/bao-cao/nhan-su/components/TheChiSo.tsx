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
 */
export default function TheChiSo({ chiSo }: { chiSo: ChiSo }) {
  const { nguon } = chiSo;

  const tieuDe = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold leading-snug text-gray-800 dark:text-gray-100">
          {chiSo.ten}
        </div>
        {chiSo.tenEn && (
          <div className="text-[11px] italic leading-tight text-gray-400 dark:text-gray-500">
            {chiSo.tenEn}
          </div>
        )}
      </div>
      <Tooltip title={chiSo.yNghia} placement="topRight">
        <InfoCircleOutlined className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-500 dark:text-gray-600" />
      </Tooltip>
    </div>
  );

  if (chuaCoNguon(nguon)) {
    return (
      <div className="bc-the flex h-full flex-col justify-between gap-3 border border-dashed border-gray-300 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-900/40">
        {tieuDe}
        <div>
          <div className="text-2xl font-light leading-none text-gray-300 dark:text-gray-600">—</div>
          <div className="mt-2 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Chưa có dữ liệu
          </div>
          <div className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
            Cần: {nguon.canGi}
          </div>
        </div>
      </div>
    );
  }

  const bienDong = tinhBienDong(nguon.giaTri, nguon.kyTruoc, chiSo.chieuTot, chiSo.donVi);

  return (
    <div className="bc-the flex h-full flex-col justify-between gap-3 border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {tieuDe}
      <div>
        <div className="text-2xl font-semibold leading-none text-gray-900 dark:text-gray-50">
          {dinhDangGiaTri(nguon.giaTri, chiSo.donVi)}
        </div>
        {bienDong && <DongBienDong bienDong={bienDong} chiSo={chiSo} />}
        <div className="mt-1.5 truncate text-[10px] text-gray-400 dark:text-gray-500" title={nguon.moTaNguon}>
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
      ? 'text-[color:var(--bc-tot)]'
      : huong === 'xau'
        ? 'text-[color:var(--bc-xau)]'
        : 'text-gray-400 dark:text-gray-500';

  const Icon = chenhLech > 0 ? ArrowUpOutlined : chenhLech < 0 ? ArrowDownOutlined : MinusOutlined;
  const dau = chenhLech > 0 ? '+' : '';

  return (
    <div className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium ${mau}`}>
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
      <span className="font-normal text-gray-400 dark:text-gray-500">so kỳ trước</span>
    </div>
  );
}
