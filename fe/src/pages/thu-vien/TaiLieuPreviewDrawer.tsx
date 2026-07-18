import React, { useEffect, useState } from "react";
import { Modal, Spin, Button, Empty } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { taiLieuService, TaiLieu } from "@/services/taiLieuService";

interface TaiLieuPreviewDrawerProps {
  item: TaiLieu | null;
  open: boolean;
  onClose: () => void;
}

const FRAME_H = "calc(90vh - 96px)";

const TaiLieuPreviewDrawer: React.FC<TaiLieuPreviewDrawerProps> = ({
  item,
  open,
  onClose,
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    if (open && item && item.type === "file") {
      setLoading(true);
      setError(null);
      taiLieuService
        .fetchFileObjectUrl(item._id)
        .then((url) => {
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          revoked = url;
          setObjectUrl(url);
        })
        .catch(() => {
          if (!cancelled) setError("Không tải được file");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
      setObjectUrl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?._id, item?.type]);

  const renderContent = () => {
    if (!item) return null;

    if (item.type === "youtube") {
      return (
        <iframe
          title={item.title}
          src={`https://www.youtube.com/embed/${item.youtubeId}`}
          style={{ width: "100%", height: FRAME_H, border: 0 }}
          allowFullScreen
        />
      );
    }

    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin />
        </div>
      );
    }

    if (error) {
      return <Empty description={error} />;
    }

    if (!objectUrl) return null;

    const mime = item.mimeType || "";

    if (mime === "application/pdf") {
      return (
        <iframe
          title={item.title}
          src={objectUrl}
          style={{ width: "100%", height: FRAME_H, border: 0 }}
        />
      );
    }

    if (mime.startsWith("image/")) {
      return (
        <img
          src={objectUrl}
          alt={item.title}
          style={{ maxWidth: "100%", maxHeight: FRAME_H, display: "block", margin: "0 auto", objectFit: "contain" }}
        />
      );
    }

    // Office / khác: không xem trực tiếp được
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <p style={{ marginBottom: 16 }}>
          Không xem trực tiếp được, vui lòng tải về.
        </p>
        <Button type="primary" icon={<DownloadOutlined />}>
          <a
            href={objectUrl}
            download={item.tenFile || item.title}
            style={{ color: "inherit" }}
          >
            Tải về
          </a>
        </Button>
      </div>
    );
  };

  return (
    <Modal
      title={item?.title}
      open={open}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ top: 24, maxWidth: 1400, paddingBottom: 0 }}
      styles={{ body: { padding: 0, overflow: "hidden" } }}
      destroyOnClose
    >
      {renderContent()}
    </Modal>
  );
};

export default TaiLieuPreviewDrawer;
