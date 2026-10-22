import { getT } from '@/lib/i18n';
import { forgotPassword } from '@/app/actions';

export default function ForgotPage({ searchParams }: { searchParams: { sent?: string } }) {
  const { t } = getT();
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">{t('auth.forgot')}</h1>
      {searchParams.sent ? (
        <p className="card border-nebula text-nebula">{t('forgot.sent')}</p>
      ) : (
        <form action={forgotPassword} className="card space-y-3">
          <label className="block space-y-1">
            <span className="text-sm">{t('auth.email')}</span>
            <input name="email" type="email" required className="input" dir="ltr" />
          </label>
          <button className="btn-primary w-full" type="submit">{t('forgot.send')}</button>
        </form>
      )}
    </div>
  );
}
