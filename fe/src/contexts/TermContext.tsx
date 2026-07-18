import React, { createContext, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { resolveTerm, TERM_REGISTRY } from '@/config/termRegistry';

interface TermContextType {
  t: (key: string, surface?: string) => string;
}

const TermContext = createContext<TermContextType | undefined>(undefined);

export const TermProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTenant, currentLinhVuc } = useAuth();
  const tenantGlossary = currentTenant?.glossary;
  const linhVucGlossary = currentLinhVuc?.glossary;

  const t = useCallback(
    (key: string, surface?: string) =>
      resolveTerm(tenantGlossary, linhVucGlossary, TERM_REGISTRY, key, surface),
    [tenantGlossary, linhVucGlossary],
  );

  return <TermContext.Provider value={{ t }}>{children}</TermContext.Provider>;
};

export const useTerm = () => {
  const ctx = useContext(TermContext);
  if (ctx === undefined) {
    throw new Error('useTerm must be used within a TermProvider');
  }
  return ctx;
};
