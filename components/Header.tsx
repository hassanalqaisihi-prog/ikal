import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n';
import { setLang, signOut } from '@/app/actions';

export default async function Header() {
  const { lang, t } = getT();
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  let name = '';
  let isAdmin = false;
  let unread = 0;
  if (user) {
    const { data: p } = await sb.from('profiles').select('display_name,is_admin').eq('id', user.id).single();
    name = p?.display_name ?? '';
    isAdmin = !!p?.is_admin;
    const { count } = await sb
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    unread = count ?? 0;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-void/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="inline-block h-4 w-4 rounded-full bg-xenon shadow-[0_0_14px_#C6FF3D]" />
          <span>عكال</span>
          <span className="text-sm font-medium text-mist/50">Ikal</span>
        </Link>

        <form action="/" method="get" className="order-3 w-full flex-1 sm:order-none sm:w-auto">
          <input name="q" type="search" placeholder={t('search.placeholder')} className="input" />
        </form>

        <div className="ms-auto flex items-center gap-2">
          <form action={setLang}>
            <input type="hidden" name="lang" value={lang === 'ar' ? 'en' : 'ar'} />
            <button className="btn" type="submit">{lang === 'ar' ? 'EN' : 'عربي'}</button>
          </form>

          {user ? (
            <>
              <Link href="/ask" className="btn-primary">{t('nav.ask')}</Link>
              <Link href="/notifications" className="btn relative" aria-label={t('nav.notifications')}>
                🔔
                {unread > 0 && (
                  <span className="absolute -top-2 end-[-6px] rounded-full bg-pink px-1.5 text-xs font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <details className="relative">
                <summary className="btn cursor-pointer list-none">{name || '☰'}</summary>
                <div className="card absolute end-0 mt-2 w-48 space-y-2 text-sm">
                  <Link className="lnk block" href={`/u/${user.id}`}>{t('nav.profile')}</Link>
                  <Link className="lnk block" href="/settings">{t('nav.settings')}</Link>
                  {isAdmin && <Link className="lnk block" href="/admin">{t('nav.admin')}</Link>}
                  <form action={signOut}>
                    <button className="lnk" type="submit">{t('nav.logout')}</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/login" className="btn">{t('nav.login')}</Link>
              <Link href="/signup" className="btn-primary">{t('nav.signup')}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
