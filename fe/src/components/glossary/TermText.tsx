import { useTerm } from '@/contexts/TermContext';

interface Props {
  tk: string;
  surface?: string;
}

/** Hiển thị nhãn động theo glossary (không sửa tại chỗ — sửa qua TableTitleSettings). */
export function TermText({ tk, surface }: Props) {
  const { t } = useTerm();
  return <>{t(tk, surface)}</>;
}
