import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n';
import { resolveReport, saveCategory } from '@/app/actions';
import PostBody from '@/components/PostBody';
import { fmtDate } from '@/lib/util';

export default async function AdminPage({ searchParams }: { searchParams: { error?: string } }) {
  const { lang, t } = getT();
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login?next=/admin');
  const { data: me } = await sb.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/');

  const { data: repData } = await sb
    .from('reports')
    .select('*, reporter:profiles!reporter_id(display_name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50);
  const reports = (repData ?? []) as any[];

  // Load the reported content for each report.
  const items = await Promise.all(
    reports.map(async (r) => {
      const table = r.target_type === 'question' ? 'questions' : r.target_type === 'answer' ? 'answers' : 'comments';
      const { data } = await sb.from(table).select('*').eq('id', r.target_id).maybeSingle();
      const qid = r.target_type === 'question' ? r.target_id : data?.question_id;
      return { r, content: data as any, link: qid ? `/q/${qid}` : null };
    })
  );

  const { data: catData } = await sb.from('categories').select('*').order('sort_order');
  const cats = (catData ?? []) as any[];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('nav.admin')}</h1>
      {searchParams.error && <p className="card border-pink text-pink">{t(`err.${searchParams.error}`)}</p>}

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-xenon">{t('admin.reports')} ({items.length})</h2>
        {items.length === 0 && <p className="card text-center">{t('admin.noreports')}</p>}
        {items.map(({ r, content, link }) => (
          <div key={r.id} className="card space-y-2">
            <p className="text-sm">
              <span className="pill border-pink text-pink">{t(`report.${r.reason}`)}</span>{' '}
              {t(`target.${r.target_type}`)} · {r.reporter?.display_name} · {fmtDate(r.created_at, lang)}
            </p>
            {r.note && <p dir="auto" className="muted">“{r.note}”</p>}
            <div className="rounded-xl border border-white/10 bg-void p-3">
              {content ? <PostBody text={content.body ?? content.title} /> : <span className="muted">—</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {link && <Link className="btn" href={link}>{t('admin.open')}</Link>}
              <form action={resolveReport}>
                <input type="hidden" name="report_id" value={r.id} />
                <input type="hidden" name="action" value="hide" />
                <button className="btn border-pink text-pink" type="submit">{t('admin.hide')}</button>
              </form>
              <form action={resolveReport}>
                <input type="hidden" name="report_id" value={r.id} />
                <input type="hidden" name="action" value="dismiss" />
                <button className="btn" type="submit">{t('admin.dismiss')}</button>
              </form>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-xenon">{t('admin.categories')}</h2>
        {cats.map((c) => (
          <form key={c.id} action={saveCategory} className="card grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_1fr_90px_auto_auto]">
            <input type="hidden" name="id" value={c.id} />
            <input name="name_ar" defaultValue={c.name_ar} className="input" dir="rtl" required />
            <input name="name_en" defaultValue={c.name_en} className="input" dir="ltr" required />
            <input name="sort_order" type="number" defaultValue={c.sort_order} className="input" />
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="is_hidden" defaultChecked={c.is_hidden} /> {t('admin.hidden')}</label>
            <button className="btn" type="submit">{t('form.save')}</button>
          </form>
        ))}
        <form action={saveCategory} className="card grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_1fr_90px_auto_auto]">
          <input type="hidden" name="id" value="" />
          <input name="name_ar" placeholder="الاسم بالعربي" className="input" dir="rtl" required />
          <input name="name_en" placeholder="English name" className="input" dir="ltr" required />
          <input name="sort_order" type="number" defaultValue={cats.length + 1} className="input" />
          <span />
          <button className="btn-primary" type="submit">{t('admin.add')}</button>
        </form>
      </section>
    </div>
  );
}
