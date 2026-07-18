import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PagePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export function usePagePermission(moduleKey: string): PagePermissions {
  const { hasPermission } = useAuth();
  const normalizedKey = moduleKey.startsWith('/') ? moduleKey : `/${moduleKey}`;

  return useMemo(() => ({
    canView: hasPermission(`${normalizedKey}:xem`),
    canCreate: hasPermission(`${normalizedKey}:them`),
    canEdit: hasPermission(`${normalizedKey}:sua`),
    canDelete: hasPermission(`${normalizedKey}:xoa`),
    canExport: hasPermission(`${normalizedKey}:xuat`),
  }), [normalizedKey, hasPermission]);
}
