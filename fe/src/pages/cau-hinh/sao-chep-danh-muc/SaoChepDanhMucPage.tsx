// SaoChepDanhMucPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, Select, Checkbox, Button, Table, Alert, Space, Typography, message } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { tenantService, type Tenant } from '@/services/tenantService';
import {
  cloneMasterDataService, type CloneCategoryOption, type PreviewRow, type ResultRow,
} from '@/services/cloneMasterDataService';

const { Title, Text } = Typography;

export default function SaoChepDanhMucPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [cats, setCats] = useState<CloneCategoryOption[]>([]);
  const [source, setSource] = useState<string>();
  const [target, setTarget] = useState<string>();
  const [checked, setChecked] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [result, setResult] = useState<ResultRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.isSuperAdmin) return;
    tenantService.getAll().then(setTenants).catch(() => message.error('Không tải được danh sách công ty'));
    cloneMasterDataService.getCategories().then((c) => { setCats(c); setChecked(c.map((x) => x.key)); })
      .catch(() => message.error('Không tải được danh mục'));
  }, [user?.isSuperAdmin]);

  const sameTenant = !!source && source === target;
  const quyChuanWithoutHoSo = checked.includes('quy-chuan') && !checked.includes('ho-so-chung-tu');
  const canPreview = !!source && !!target && !sameTenant && checked.length > 0;

  const body = useMemo(() => ({ sourceTenantId: source!, targetTenantId: target!, categories: checked }),
    [source, target, checked]);

  if (!user?.isSuperAdmin) return <Navigate to="/" replace />;

  const doPreview = async () => {
    setLoading(true); setResult(null);
    try { setPreview(await cloneMasterDataService.preview(body)); }
    catch (e: any) { message.error(e?.message || 'Lỗi xem trước'); }
    finally { setLoading(false); }
  };
  const doExecute = async () => {
    setLoading(true);
    try {
      const res = await cloneMasterDataService.execute(body);
      setResult(res); setPreview(null);
      message.success('Đã sao chép xong');
    } catch (e: any) { message.error(e?.message || 'Lỗi sao chép'); }
    finally { setLoading(false); }
  };

  const tenantOpts = tenants.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Sao chép danh mục giữa công ty</Title>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <div>
              <Text>Công ty nguồn</Text><br />
              <Select style={{ width: 360 }} placeholder="Chọn công ty nguồn" options={tenantOpts}
                value={source} onChange={(v) => { setSource(v); setPreview(null); setResult(null); }} showSearch optionFilterProp="label" />
            </div>
            <div>
              <Text>Công ty đích</Text><br />
              <Select style={{ width: 360 }} placeholder="Chọn công ty đích" options={tenantOpts}
                value={target} onChange={(v) => { setTarget(v); setPreview(null); setResult(null); }} showSearch optionFilterProp="label" />
            </div>
          </Space>
          {sameTenant && <Alert type="error" message="Công ty nguồn và đích phải khác nhau" showIcon />}
          <div>
            <Text strong>Danh mục cần sao chép</Text>
            <Checkbox.Group style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}
              options={cats.map((c) => ({ label: c.label, value: c.key }))}
              value={checked} onChange={(v) => { setChecked(v as string[]); setPreview(null); setResult(null); }} />
          </div>
          {quyChuanWithoutHoSo && (
            <Alert type="warning" showIcon
              message="Bạn chọn Quy chuẩn nhưng bỏ Biên tập hồ sơ — nên tick kèm để liên kết hồ sơ chính xác." />
          )}
          <Space>
            <Button type="default" loading={loading} disabled={!canPreview} onClick={doPreview}>Xem trước</Button>
            <Button type="primary" loading={loading} disabled={!preview} onClick={doExecute}>Sao chép</Button>
          </Space>
        </Space>
      </Card>

      {preview && (
        <Card title="Xem trước" style={{ marginTop: 16 }}>
          <Table rowKey="key" pagination={false} dataSource={preview}
            columns={[
              { title: 'Danh mục', dataIndex: 'label' },
              { title: 'Tổng nguồn', dataIndex: 'total' },
              { title: 'Sẽ thêm', dataIndex: 'willInsert' },
              { title: 'Bỏ qua (trùng)', dataIndex: 'willSkip' },
            ]} />
        </Card>
      )}
      {result && (
        <Card title="Kết quả" style={{ marginTop: 16 }}>
          <Table rowKey="key" pagination={false} dataSource={result}
            columns={[
              { title: 'Danh mục', dataIndex: 'label' },
              { title: 'Đã thêm', dataIndex: 'inserted' },
              { title: 'Bỏ qua', dataIndex: 'skipped' },
              { title: 'Lỗi', dataIndex: 'error', render: (e: string) => e || '—' },
            ]} />
        </Card>
      )}
    </div>
  );
}
