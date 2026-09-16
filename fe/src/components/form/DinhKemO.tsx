import { useCallback, useEffect, useState } from "react";
import { Button, Upload, Tooltip, message } from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import { apiErrorMessage } from "@/config/api";
import {
  dinhKemService,
  type DinhKem,
  type DoiTuongDinhKem,
} from "@/services/dinhKemService";

interface Props {
  nhan: string;
  doiTuong: DoiTuongDinhKem;
  /** id bản ghi chủ, hoặc id nháp khi hồ sơ chưa lưu (xem `idNhap()`). */
  doiTuongId: string;
  nhom: string;
  /** id dòng con (một bằng cấp, một người phụ thuộc). */
  khoaPhu?: string;
  /** false = chỉ giữ MỘT tệp, tải lên tệp mới thì xoá tệp cũ. */
  nhieu?: boolean;
  goiY?: string;
  /** Khoá thao tác (vd không có quyền sửa). */
  chiXem?: boolean;
}

function coCheDoc(mime: string): boolean {
  return mime.startsWith("image/") || mime === "application/pdf";
}

/**
 * Ô đính kèm tệp cho một chỗ cụ thể trong hồ sơ (ảnh CCCD, sơ yếu lý lịch,
 * bằng cấp, giấy tờ người phụ thuộc, biên bản bàn giao…).
 *
 * Tự nạp danh sách theo bộ ba `(doiTuong, doiTuongId, nhom)` + `khoaPhu`, nên
 * nơi dùng không phải giữ state gì. Khi hồ sơ CHƯA lưu, `doiTuongId` là id
 * nháp; form gọi `dinhKemService.gan()` sau khi lưu để chuyển sang id thật.
 *
 * Tệp Word không xem trực tiếp trong trình duyệt được nên nút bấm là TẢI VỀ,
 * còn ảnh/PDF thì mở tab mới — hai việc khác nhau, không gộp một nhãn chung
 * "Xem" rồi để người dùng bấm vào một tab trắng.
 */
export function DinhKemO({
  nhan,
  doiTuong,
  doiTuongId,
  nhom,
  khoaPhu,
  nhieu = false,
  goiY,
  chiXem = false,
}: Props) {
  const [ds, setDs] = useState<DinhKem[]>([]);
  const [dangTai, setDangTai] = useState(false);

  const nap = useCallback(async () => {
    if (!doiTuongId) return;
    try {
      setDs(
        await dinhKemService.danhSach({ doiTuong, doiTuongId, nhom, khoaPhu })
      );
    } catch {
      // Không chặn form vì một ô đính kèm không nạp được (vd chưa có quyền
      // xem): các ô khác vẫn phải dùng được.
      setDs([]);
    }
  }, [doiTuong, doiTuongId, nhom, khoaPhu]);

  useEffect(() => {
    void nap();
  }, [nap]);

  const taiLen = async (file: File) => {
    setDangTai(true);
    try {
      const cu = nhieu ? [] : ds;
      await dinhKemService.tai({ doiTuong, doiTuongId, nhom, khoaPhu, file });
      // Một-tệp: xoá bản cũ SAU khi bản mới đã lên, để lỗi mạng giữa chừng
      // không làm mất cả hai.
      for (const c of cu) {
        await dinhKemService.xoa(c._id).catch(() => undefined);
      }
      await nap();
      message.success("Đã tải tệp lên");
    } catch (e) {
      message.error(apiErrorMessage(e));
    } finally {
      setDangTai(false);
    }
    return false as const; // chặn antd tự gửi request của nó
  };

  const xoa = async (id: string) => {
    try {
      await dinhKemService.xoa(id);
      await nap();
    } catch (e) {
      message.error(apiErrorMessage(e));
    }
  };

  const mo = async (dk: DinhKem) => {
    try {
      const url = await dinhKemService.lienKetXem(dk._id);
      if (coCheDoc(dk.mimeType)) {
        window.open(url, "_blank", "noopener");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = dk.tenFile;
        a.click();
      }
      // Nhả sau một nhịp: thu hồi ngay thì tab mới chưa kịp đọc xong blob.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      message.error(apiErrorMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold text-[hsl(var(--ink-1))]">
        {nhan}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {ds.map((dk) => (
          <span
            key={dk._id}
            className="inline-flex max-w-[260px] items-center gap-1 border border-border bg-muted px-1.5 py-[2px] text-[11px]"
          >
            <PaperClipOutlined className="shrink-0 text-[10px]" />
            <button
              type="button"
              className="truncate text-left hover:underline"
              onClick={() => void mo(dk)}
              title={dk.tenFile}
            >
              {dk.tenFile}
            </button>
            {!chiXem && (
              <Tooltip title="Xoá tệp">
                <button
                  type="button"
                  className="shrink-0 text-[hsl(var(--ink-2))] hover:text-[hsl(var(--nguy))]"
                  onClick={() => void xoa(dk._id)}
                  aria-label={`Xoá ${dk.tenFile}`}
                >
                  <DeleteOutlined className="text-[10px]" />
                </button>
              </Tooltip>
            )}
          </span>
        ))}
        {!chiXem && (nhieu || ds.length === 0) && (
          <Upload
            beforeUpload={taiLen}
            showUploadList={false}
            maxCount={1}
            accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx"
          >
            <Button size="small" icon={<UploadOutlined />} loading={dangTai}>
              Tải tệp
            </Button>
          </Upload>
        )}
        {!chiXem && !nhieu && ds.length > 0 && (
          <Upload
            beforeUpload={taiLen}
            showUploadList={false}
            maxCount={1}
            accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx"
          >
            <Button size="small" type="text" loading={dangTai}>
              Thay tệp
            </Button>
          </Upload>
        )}
      </div>
      {goiY && (
        <div className="mt-[2px] text-[10.5px] text-[hsl(var(--ink-2))]">
          {goiY}
        </div>
      )}
    </div>
  );
}
