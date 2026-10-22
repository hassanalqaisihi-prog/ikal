import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n';
import { changeEmail, changePassword, updateSettings } from '@/app/actions';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string; emailsent?: string };
}) {
  const { t } = getT();
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login?next=/settings');
  const { data: p } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (!p) redirect('/');

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>
      {searchParams.saved && <p className="card border-nebula text-nebula">{t('settings.saved')}</p>}
      {searchParams.emailsent && <p className="card border-nebula text-nebula">{t('settings.emailsent')}</p>}
      {searchParams.error && <p className="card border-pink text-pink">{t(`err.${searchParams.error}`)}</p>}

      <form action={updateSettings} className="card space-y-4">
        <label className="block space-y-1">
          <span className="text-sm">{t('auth.name')}</span>
          <input name="display_name" required minLength={2} maxLength={40} defaultValue={p.display_name} className="input" dir="auto" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">{t('profile.bio')}</span>
          <textarea name="bio" rows={3} maxLength={300} defaultValue={p.bio} className="input" dir="auto" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">{t('settings.language')}</span>
          <select name="language" defaultValue={p.language} className="input">
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold">{t('settings.emails')}</legend>
          <label className="flex items-center gap-2"><input type="checkbox" name="email_on_answer" defaultChecked={p.email_on_answer} /> {t('settings.on_answer')}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="email_on_comment" defaultChecked={p.email_on_comment} /> {t('settings.on_comment')}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="email_on_accepted" defaultChecked={p.email_on_accepted} /> {t('settings.on_accepted')}</label>
        </fieldset>
        <button className="btn-primary" type="submit">{t('form.save')}</button>
      </form>

      <form action={changeEmail} className="card space-y-3">
        <label className="block space-y-1">
          <span className="text-sm">{t('settings.newemail')} ({user.email})</span>
          <input name="email" type="email" required className="input" dir="ltr" />
        </label>
        <button className="btn" type="submit">{t('form.save')}</button>
      </form>

      <form action={changePassword} className="card space-y-3">
        <label className="block space-y-1">
          <span className="text-sm">{t('reset.new')}</span>
          <input name="password" type="password" required minLength={8} className="input" dir="ltr" autoComplete="new-password" />
        </label>
        <button className="btn" type="submit">{t('form.save')}</button>
      </form>
    </div>
  );
}
