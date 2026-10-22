import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n';
import { fmtDate } from '@/lib/util';

export default async function NotificationsPage() {
  const { lang, t } = getT();
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login?next=/notifications');

  const { data } = await sb
    .from('notifications')
    .select('*, actor:profiles!actor_id(display_name), question:questions!question_id(id,title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  const rows = (data ?? []) as any[];

  // Opening the list marks everything as read (the list above still shows what was new).
  if (rows.some((r) => !r.is_read)) {
    await sb.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-2xl font-bold">{t('nav.notifications')}</h1>
      {rows.length === 0 && <p className="card text-center">{t('notif.empty')}</p>}
      {rows.map((n) => (
        <Link
          key={n.id}
          href={`/q/${n.question_id}${n.answer_id ? `#a-${n.answer_id}` : ''}`}
          className={`card block hover:border-nebula ${n.is_read ? '' : 'border-xenon/70'}`}
        >
          <p>
            <b>{n.actor?.display_name ?? '—'}</b> {t(`notif.${n.type}`)}
          </p>
          <p dir="auto" className="mt-1 text-sm text-mist/70">{n.question?.title}</p>
          <p className="muted mt-1">{fmtDate(n.created_at, lang)}</p>
        </Link>
      ))}
    </div>
  );
}
