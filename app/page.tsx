import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n';
import QuestionCard from '@/components/QuestionCard';
import { catName, qs } from '@/lib/util';

const PAGE = 20;
type SP = { tab?: string; cat?: string; tag?: string; q?: string; page?: string; welcome?: string; pw?: string };

export default async function Home({ searchParams }: { searchParams: SP }) {
  const { lang, t } = getT();
  const sb = createClient();
  const tab = ['new', 'unanswered', 'top'].includes(searchParams.tab ?? '') ? searchParams.tab! : 'new';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const { data: catData } = await sb.from('categories').select('*').order('sort_order');
  const cats = (catData ?? []) as any[];
  const cat = cats.find((c) => c.slug === searchParams.cat);

  let ids: string[] | null = null;
  if (searchParams.tag) {
    const { data } = await sb
      .from('question_tags')
      .select('question_id,tags!inner(name)')
      .eq('tags.name', searchParams.tag.toLowerCase())
      .limit(1000);
    ids = ((data ?? []) as any[]).map((r) => r.question_id);
  }

  let query = sb
    .from('questions')
    .select(
      'id,title,body,score,answer_count,accepted_answer_id,created_at,author:profiles!author_id(id,display_name),category:categories!category_id(slug,name_ar,name_en),question_tags(tags(name))',
      { count: 'exact' }
    )
    .eq('status', 'open');
  if (cat) query = query.eq('category_id', cat.id);
  if (ids) query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  if (searchParams.q) query = query.textSearch('search', searchParams.q, { type: 'websearch', config: 'simple' });
  if (tab === 'unanswered') query = query.eq('answer_count', 0);
  query =
    tab === 'top'
      ? query.order('score', { ascending: false }).order('created_at', { ascending: false })
      : query.order('created_at', { ascending: false });

  const from = (page - 1) * PAGE;
  const { data, count } = await query.range(from, from + PAGE - 1);
  const rows = (data ?? []) as any[];
  const total = count ?? 0;
  const hasNext = from + PAGE < total;

  const base = { cat: searchParams.cat, tag: searchParams.tag, q: searchParams.q };
  const tabLink = (k: string) => `/${qs({ ...base, tab: k === 'new' ? undefined : k })}`;
  const pageLink = (p: number) => `/${qs({ ...base, tab: tab === 'new' ? undefined : tab, page: p > 1 ? String(p) : undefined })}`;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_220px]">
      <section className="space-y-4">
        {searchParams.welcome && <p className="card border-xenon text-xenon">{t('welcome.note')}</p>}
        {searchParams.pw && <p className="card border-nebula text-nebula">{t('pw.changed')}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {(['new', 'unanswered', 'top'] as const).map((k) => (
            <Link
              key={k}
              href={tabLink(k)}
              className={tab === k ? 'btn-primary' : 'btn'}
            >
              {t(`tab.${k}`)}
            </Link>
          ))}
        </div>

        {(searchParams.q || searchParams.tag || cat) && (
          <p className="muted">
            {searchParams.q && <>🔎 “{searchParams.q}” </>}
            {searchParams.tag && <>#{searchParams.tag} </>}
            {cat && <>{catName(cat, lang)} </>}
            · <Link className="lnk" href="/">{t('filter.clear')}</Link>
          </p>
        )}

        {rows.length === 0 ? (
          <div className="card text-center">
            <p>{searchParams.q ? t('search.empty') : t('feed.empty')}</p>
            <Link href="/ask" className="btn-primary mt-3">{t('nav.ask')}</Link>
          </div>
        ) : (
          rows.map((q) => <QuestionCard key={q.id} q={q} lang={lang} t={t} />)
        )}

        <div className="flex justify-between">
          {page > 1 ? <Link className="btn" href={pageLink(page - 1)}>{t('page.prev')}</Link> : <span />}
          {hasNext ? <Link className="btn" href={pageLink(page + 1)}>{t('page.next')}</Link> : <span />}
        </div>
      </section>

      <aside className="space-y-2">
        <h2 className="font-bold text-xenon">{t('categories')}</h2>
        <nav className="flex flex-col gap-1">
          {cats.filter((c) => !c.is_hidden).map((c) => (
            <Link
              key={c.id}
              href={`/${qs({ cat: c.slug })}`}
              className={`rounded-lg px-3 py-1.5 text-sm hover:bg-white/5 ${searchParams.cat === c.slug ? 'bg-white/10 text-nebula' : ''}`}
            >
              {catName(c, lang)}
            </Link>
          ))}
        </nav>
      </aside>
    </div>
  );
}
