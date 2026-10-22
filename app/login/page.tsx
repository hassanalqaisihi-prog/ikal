import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { logIn, resendConfirmation } from '@/app/actions';
import { safePath } from '@/lib/util';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; email?: string; next?: string; sent?: string };
}) {
  const { t } = getT();
  const next = safePath(searchParams.next);
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.login')}</h1>
      {searchParams.sent && <p className="card border-nebula text-nebula">{t('login.sent')}</p>}
      {searchParams.error && <p className="card border-pink text-pink">{t(`err.${searchParams.error}`)}</p>}
      <form action={logIn} className="card space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block space-y-1">
          <span className="text-sm">{t('auth.email')}</span>
          <input name="email" type="email" required defaultValue={searchParams.email} className="input" dir="ltr" autoComplete="email" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">{t('auth.password')}</span>
          <input name="password" type="password" required className="input" dir="ltr" autoComplete="current-password" />
        </label>
        <button className="btn-primary w-full" type="submit">{t('nav.login')}</button>
        <p className="text-sm">
          <Link className="lnk" href="/forgot">{t('auth.forgot')}</Link> · <Link className="lnk" href="/signup">{t('nav.signup')}</Link>
        </p>
      </form>
      {searchParams.error === 'unconfirmed' && searchParams.email && (
        <form action={resendConfirmation} className="card">
          <input type="hidden" name="email" value={searchParams.email} />
          <button className="btn w-full" type="submit">{t('auth.resend')}</button>
        </form>
      )}
    </div>
  );
}
