import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n';
import PostBody from '@/components/PostBody';
import VoteBox from '@/components/VoteBox';
import CommentBlock from '@/components/CommentBlock';
import ReportBox from '@/components/ReportBox';
import ConfirmButton from '@/components/ConfirmButton';
import { acceptAnswer, addAnswer, deleteAnswer, deleteQuestion, updateAnswer } from '@/app/actions';
import { catName, fmtDate } from '@/lib/util';

export default async function QuestionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; reported?: string };
}) {
  const { lang, t } = getT();
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const { data: q } = await sb
    .from('questions')
    .select(
      '*, author:profiles!author_id(id,display_name,reputation), category:categories!category_id(slug,name_ar,name_en), question_tags(tags(name))'
    )
    .eq('id', params.id)
    .maybeSingle();
  if (!q) notFound();

  await sb.rpc('bump_view', { p_id: q.id });

  const { data: ansData } = await sb
    .from('answers')
    .select('*, author:profiles!author_id(id,display_name,reputation)')
    .eq('question_id', q.id);
  const accepted = q.accepted_answer_id as string | null;
  const answers = ((ansData ?? []) as any[]).sort(
    (a, b) =>
      Number(b.id === accepted) - Number(a.id === accepted) ||
      b.score - a.score ||
      +new Date(a.created_at) - +new Date(b.created_at)
  );

  const { data: comData } = await sb
    .from('comments')
    .select('*, author:profiles!author_id(display_name)')
    .eq('question_id', q.id)
    .order('created_at');
  const comments = (comData ?? []) as any[];

  let isAdmin = false;
  let myQVote = 0;
  const myAVotes: Record<string, number> = {};
  if (user) {
    const { data: p } = await sb.from('profiles').select('is_admin').eq('id', user.id).single();
    isAdmin = !!p?.is_admin;
    const { data: qv } = await sb.from('votes').select('value').eq('user_id', user.id).eq('question_id', q.id).maybeSingle();
    myQVote = qv?.value ?? 0;
    if (answers.length) {
      const { data: av } = await sb
        .from('votes')
        .select('answer_id,value')
        .eq('user_id', user.id)
        .in('answer_id', answers.map((a) => a.id));
      ((av ?? []) as any[]).forEach((v) => (myAVotes[v.answer_id] = v.value));
    }
  }

  const back = `/q/${q.id}`;
  const isOwner = user?.id === q.author_id;
  const myAnswer = user ? answers.find((a) => a.author_id === user.id) : undefined;
  const tags = ((q.question_tags ?? []) as any[]).map((x) => x.tags?.name).filter(Boolean);
  const qComments = comments.filter((c) => !c.answer_id);

  return (
    <div className="space-y-6">
      {searchParams.error && <p className="card border-pink text-pink">{t(`err.${searchParams.error}`)}</p>}
      {searchParams.reported && <p className="card border-nebula text-nebula">{t('report.thanks')}</p>}
      {q.status === 'hidden' && <p className="card border-pink text-pink">{t('post.hidden')}</p>}

      <article className="card flex gap-4">
        <VoteBox kind="question" id={q.id} score={q.score} mine={myQVote} back={back} />
        <div className="min-w-0 flex-1 space-y-3">
          <h1 dir="auto" className="text-2xl font-bold">{q.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {accepted && <span className="pill border-xenon text-xenon">✓ {t('solved')}</span>}
            {q.category && (
              <Link className="pill border-ultra text-ultra" href={`/?cat=${q.category.slug}`}>{catName(q.category, lang)}</Link>
            )}
            {tags.map((n: string) => (
              <Link key={n} className="pill" href={`/?tag=${encodeURIComponent(n)}`}>#{n}</Link>
            ))}
            <span className="ms-auto text-mist/50">
              <Link className="lnk" href={`/u/${q.author?.id}`}>{q.author?.display_name}</Link> · {fmtDate(q.created_at, lang)}
              {q.updated_at !== q.created_at && ` · ${t('edited')}`} · {q.view_count} {t('views')}
            </span>
          </div>
          <PostBody text={q.body} />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {isOwner && (
              <>
                <Link className="lnk" href={`/q/${q.id}/edit`}>{t('post.edit')}</Link>
                <form action={deleteQuestion}>
                  <input type="hidden" name="id" value={q.id} />
                  <ConfirmButton message={t('confirm.delete')} className="text-mist/60 hover:text-pink">{t('post.delete')}</ConfirmButton>
                </form>
              </>
            )}
            {!isOwner && user && <ReportBox type="question" id={q.id} back={back} t={t} />}
          </div>
          <CommentBlock comments={qComments} questionId={q.id} back={back} userId={user?.id ?? null} isAdmin={isAdmin} t={t} lang={lang} />
        </div>
      </article>

      <h2 className="text-xl font-bold">
        {answers.length} {t('answers')}
      </h2>

      {answers.map((a) => {
        const own = user?.id === a.author_id;
        const isAccepted = a.id === accepted;
        return (
          <article
            id={`a-${a.id}`}
            key={a.id}
            className={`card flex gap-4 ${isAccepted ? 'border-xenon/70' : ''}`}
          >
            <div className="flex flex-col items-center gap-2">
              <VoteBox kind="answer" id={a.id} score={a.score} mine={myAVotes[a.id] ?? 0} back={back} />
              {(isOwner || isAccepted) && (
                <form action={acceptAnswer}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="question_id" value={q.id} />
                  <button
                    type={isOwner ? 'submit' : 'button'}
                    title={t('answer.accept')}
                    className={`h-9 w-9 rounded-lg border text-lg ${isAccepted ? 'border-xenon bg-xenon/20 text-xenon' : 'border-white/15 text-mist/50 hover:border-xenon'}`}
                  >
                    ✓
                  </button>
                </form>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {a.status === 'hidden' && <p className="text-pink">{t('post.hidden')}</p>}
              <PostBody text={a.body} />
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="muted">
                  <Link className="lnk" href={`/u/${a.author?.id}`}>{a.author?.display_name}</Link> · {fmtDate(a.created_at, lang)}
                  {a.updated_at !== a.created_at && ` · ${t('edited')}`}
                </span>
                {own && (
                  <>
                    <details>
                      <summary className="cursor-pointer text-nebula">{t('post.edit')}</summary>
                      <form action={updateAnswer} className="mt-2 w-[min(100%,36rem)] space-y-2">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="question_id" value={q.id} />
                        <textarea name="body" required minLength={20} rows={6} defaultValue={a.body} className="input" dir="auto" />
                        <button className="btn" type="submit">{t('form.save')}</button>
                      </form>
                    </details>
                    <form action={deleteAnswer}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="question_id" value={q.id} />
                      <ConfirmButton message={t('confirm.delete')} className="text-mist/60 hover:text-pink">{t('post.delete')}</ConfirmButton>
                    </form>
                  </>
                )}
                {!own && user && <ReportBox type="answer" id={a.id} back={back} t={t} />}
              </div>
              <CommentBlock
                comments={comments.filter((c) => c.answer_id === a.id)}
                questionId={q.id}
                answerId={a.id}
                back={back}
                userId={user?.id ?? null}
                isAdmin={isAdmin}
                t={t}
                lang={lang}
              />
            </div>
          </article>
        );
      })}

      {!user ? (
        <p className="card text-center">
          <Link className="lnk" href={`/login?next=${encodeURIComponent(back)}`}>{t('answer.login')}</Link>
        </p>
      ) : myAnswer ? (
        <p className="card muted">{t('answer.already')}</p>
      ) : (
        <form action={addAnswer} className="card space-y-3">
          <h3 className="font-bold">{t('answer.yours')}</h3>
          <input type="hidden" name="question_id" value={q.id} />
          <textarea name="body" required minLength={20} maxLength={10000} rows={7} className="input" dir="auto" />
          <span className="muted block">{t('form.body.hint')}</span>
          <button className="btn-primary" type="submit">{t('answer.post')}</button>
        </form>
      )}
    </div>
  );
}
