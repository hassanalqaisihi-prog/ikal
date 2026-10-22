import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n';
import QuestionCard from '@/components/QuestionCard';
import { fmtDate, snippet } from '@/lib/util';

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const { lang, t } = getT();
  const sb = createClient();
  const { data: p } = await sb.from('profiles').select('*').eq('id', params.id).maybeSingle();
  if (!p) notFound();

  const { data: qs } = await sb
    .from('questions')
    .select(
      'id,title,body,score,answer_count,accepted_answer_id,created_at,author:profiles!author_id(id,display_name),category:categories!category_id(slug,name_ar,name_en),question_tags(tags(name))'
    )
    .eq('author_id', p.id)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(20);
  const { data: ans } = await sb
    .from('answers')
    .select('id,body,score,created_at,question:questions!question_id(id,title)')
    .eq('author_id', p.id)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <section className="card flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ background: p.avatar_color }}
        >
          {(p.display_name as string).slice(0, 1)}
        </div>
        <div>
          <h1 className="text-2xl font-bold" dir="auto">{p.display_name}</h1>
          <p className="muted">
            {t('profile.reputation')}: <b className="text-xenon">{p.reputation}</b> · {t('profile.joined')} {fmtDate(p.created_at, lang)}
          </p>
          {p.bio && <p dir="auto" className="mt-1">{p.bio}</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t('profile.questions')}</h2>
        {((qs ?? []) as any[]).length === 0 && <p className="muted">{t('profile.none')}</p>}
        {((qs ?? []) as any[]).map((q) => (
          <QuestionCard key={q.id} q={q} lang={lang} t={t} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t('profile.answers')}</h2>
        {((ans ?? []) as any[]).length === 0 && <p className="muted">{t('profile.none')}</p>}
        {((ans ?? []) as any[]).map((a) => (
          <Link key={a.id} href={`/q/${a.question?.id}#a-${a.id}`} className="card block hover:border-nebula">
            <p dir="auto" className="font-bold">{a.question?.title}</p>
            <p dir="auto" className="mt-1 text-sm text-mist/70">{snippet(a.body, 200)}</p>
            <p className="muted mt-1">▲ {a.score} · {fmtDate(a.created_at, lang)}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
