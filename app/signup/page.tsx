import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { signUp } from '@/app/actions';

export default function SignupPage({ searchParams }: { searchParams: { error?: string; sent?: string } }) {
  const { t } = getT();
  if (searchParams.sent) {
    return (
      <div className="card mx-auto max-w-sm text-center">
        <p className="text-3xl">✉️</p>
        <h1 className="mt-2 text-xl font-bold">{t('signup.check')}</h1>
        <p className="muted mt-2">{t('signup.check.text')}</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.signup')}</h1>
      {searchParams.error && <p className="card border-pink text-pink">{t(`err.${searchParams.error}`)}</p>}
      <form action={signUp} className="card space-y-3">
        {/* Honeypot: real people never see or fill this field. */}
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <label className="block space-y-1">
          <span className="text-sm">{t('auth.name')}</span>
          <input name="name" required minLength={2} maxLength={40} className="input" dir="auto" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">{t('auth.email')}</span>
          <input name="email" type="email" required className="input" dir="ltr" autoComplete="email" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">{t('auth.password')}</span>
          <input name="password" type="password" required minLength={8} className="input" dir="ltr" autoComplete="new-password" />
          <span className="muted">{t('auth.password.hint')}</span>
        </label>
        <button className="btn-primary w-full" type="submit">{t('nav.signup')}</button>
        <p className="text-sm">
          {t('auth.have')} <Link className="lnk" href="/login">{t('nav.login')}</Link>
        </p>
      </form>
    </div>
  );
}
