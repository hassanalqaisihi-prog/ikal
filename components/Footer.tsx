import Link from 'next/link';
import { getT } from '@/lib/i18n';

export default function Footer() {
  const { t } = getT();
  return (
    <footer className="mt-10 border-t border-white/10 py-6 text-center text-sm text-mist/50">
      <Link href="/rules" className="lnk">{t('footer.rules')}</Link>
      <span className="mx-2">·</span>
      <span>© {new Date().getFullYear()} عكال · Ikal</span>
    </footer>
  );
}
