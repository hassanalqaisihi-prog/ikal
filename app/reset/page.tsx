import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n';
import { resetPassword } from '@/app/actions';

export default async function ResetPage({ searchParams }: { searchParams: { error?: string } }) {
  const { t } = getT();
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login?error=link');
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">{t('reset.title')}</h1>
      {searchParams.error && <p className="card border-pink text-pink">{t(`err.${searchParams.error}`)}</p>}
      <form action={resetPassword} className="card space-y-3">
        <label className="block space-y-1">
          <span className="text-sm">{t('reset.new')}</span>
          <input name="password" type="password" required minLength={8} className="input" dir="ltr" autoComplete="new-password" />
        </label>
        <button className="btn-primary w-full" type="submit">{t('form.save')}</button>
      </form>
    </div>
  );
}
