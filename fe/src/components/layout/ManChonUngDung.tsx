import { Typography } from 'antd';
import { BankOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { OIconApp } from '@/components/icons/OIconApp';
import { layMauApp } from '@/components/icons/quyCachIconApp';

export interface AppTrongMan {
  appId: string;
  name: string;
}

export interface ManChonUngDungProps {
  danhSach: AppTrongMan[];
  /** App đang mở — thẻ có viền đậm + huy hiệu "Đang dùng". */
  appHienTai: string;
  /** App đã bật cho công ty đang chọn. App không nằm trong đây thì mờ, không bấm được. */
  daBat: (appId: string) => boolean;
  tenCongTy?: string;
  onChon: (appId: string) => void;
  onDong: () => void;
}

/**
 * RUỘT của modal "Chọn ứng dụng" — chỉ hiển thị, không tự lấy dữ liệu.
 *
 * Tách khỏi `AppSwitcher` để dựng được ở trang nghiệm thu
 * (/bang-du-lieu.harness.html) mà không cần đăng nhập, và để test được từng
 * trạng thái thẻ mà không phải giả lập cả AuthContext lẫn Identity.
 *
 * Dựng theo bản vẽ Pencil 10/09/2026.
 */
export function ManChonUngDung({
  danhSach,
  appHienTai,
  daBat,
  tenCongTy,
  onChon,
  onDong,
}: ManChonUngDungProps) {
  return (
    <>
      <div className="flex items-start justify-between px-1 pt-1 pb-3">
        <div>
          <Typography.Title level={4} style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 18 }}>
            Chọn ứng dụng
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Dùng chung một tài khoản MasterCEO
          </Typography.Text>
        </div>
        <button
          type="button"
          onClick={onDong}
          aria-label="Đóng"
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            border: 'none',
            background: '#7676801F',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloseOutlined style={{ fontSize: 12, color: '#6E6E73' }} />
        </button>
      </div>

      <div className="flex gap-[10px] pb-3">
        {danhSach.map((a) => {
          const dangDung = a.appId === appHienTai;
          const bat = daBat(a.appId);
          const mau = layMauApp(a.appId);
          return (
            <div
              key={a.appId}
              onClick={() => onChon(a.appId)}
              title={!bat ? 'Ứng dụng chưa được bật cho công ty này' : undefined}
              style={{
                flex: '1 1 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 9,
                padding: '14px 10px 12px',
                borderRadius: 9,
                background: mau.nen,
                border: dangDung ? `2px solid ${mau.cuoi}` : '1px solid #00000014',
                cursor: dangDung ? 'default' : bat ? 'pointer' : 'not-allowed',
                opacity: bat ? 1 : 0.4,
                filter: bat ? 'none' : 'grayscale(1)',
              }}
            >
              <OIconApp appId={a.appId} size={64} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1D1D1F' }}>{a.name}</span>
              {dangDung ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: `linear-gradient(82deg, ${mau.dau} 9%, ${mau.cuoi} 91%)`,
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  <CheckOutlined style={{ fontSize: 10 }} />
                  Đang dùng
                </span>
              ) : bat ? (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: mau.cuoi }}>Mở</span>
              ) : (
                <span style={{ fontSize: 10.5, color: '#8E8E93' }}>Chưa bật</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Chân modal chạm mép: antd 6 để đệm mặc định 24px ngang, 20px dưới. */}
      <div
        className="flex items-center"
        style={{
          margin: '0 -24px -20px',
          padding: '10px 16px',
          background: '#FBFBFD',
          borderTop: '1px solid #F0F0F3',
        }}
      >
        <span className="flex items-center gap-[7px]" style={{ fontSize: 11.5, color: '#6E6E73' }}>
          <BankOutlined style={{ color: '#98989D' }} />
          {tenCongTy ?? '—'}
        </span>
      </div>
    </>
  );
}

export default ManChonUngDung;
