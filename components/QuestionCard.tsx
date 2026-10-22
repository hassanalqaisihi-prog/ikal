import Link from 'next/link';
import { catName, fmtDate, snippet } from '@/lib/util';

export default function QuestionCard({ q, lang, t }: { q: any; lang: string; t: (k: string) => string }) {
  const tags = ((q.question_tags ?? []) as any[]).map((x) => x.tags?.name).filter(Boolean);
  return (
    <article className="card flex gap-4">
      <div className="flex w-16 shrink-0 flex-col items-center gap-1 text-center text-sm">
        <span className="text-lg font-bold">{q.score}</span>
        <span className="muted">{t('votes')}</span>
        <span
          className={`mt-1 rounded-lg border px-2 py-0.5 text-xs ${
            q.accepted_answer_id ? 'border-xenon text-xenon' : 'border-white/15 text-mist/70'
          }`}
        >
          {q.answer_count} {t('answers')}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/q/${q.id}`} dir="auto" className="block text-lg font-bold hover:text-nebula">
          {q.accepted_answer_id ? '✓ ' : ''}
          {q.title}
        </Link>
        <p dir="auto" className="mt-1 line-clamp-2 text-sm text-mist/70">{snippet(q.body)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {q.category && (
            <Link className="pill border-ultra text-ultra" href={`/?cat=${q.category.slug}`}>{catName(q.category, lang)}</Link>
          )}
          {tags.map((n: string) => (
            <Link key={n} className="pill" href={`/?tag=${encodeURIComponent(n)}`}>#{n}</Link>
          ))}
          <span className="ms-auto text-mist/50">
            {q.author?.display_name} · {fmtDate(q.created_at, lang)}
          </span>
        </div>
      </div>
    </article>
  );
}
