import Link from 'next/link';
import { addComment, deleteComment } from '@/app/actions';
import ConfirmButton from './ConfirmButton';
import ReportBox from './ReportBox';
import { fmtDate } from '@/lib/util';

export default function CommentBlock({
  comments,
  questionId,
  answerId,
  back,
  userId,
  isAdmin,
  t,
  lang,
}: {
  comments: any[];
  questionId: string;
  answerId?: string;
  back: string;
  userId: string | null;
  isAdmin: boolean;
  t: (k: string) => string;
  lang: string;
}) {
  return (
    <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
          <div className="min-w-0">
            <p dir="auto" className="whitespace-pre-wrap break-words">
              {c.body}{' '}
              <span className="muted">
                — <Link className="lnk" href={`/u/${c.author_id}`}>{c.author?.display_name}</Link> · {fmtDate(c.created_at, lang)}
              </span>
            </p>
            {userId && c.author_id !== userId && <ReportBox type="comment" id={c.id} back={back} t={t} />}
          </div>
          {(c.author_id === userId || isAdmin) && (
            <form action={deleteComment}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="question_id" value={questionId} />
              <ConfirmButton message={t('confirm.delete')} className="text-mist/50 hover:text-pink">×</ConfirmButton>
            </form>
          )}
        </div>
      ))}
      <details>
        <summary className="cursor-pointer text-sm text-nebula">{t('comment.add')}</summary>
        <form action={addComment} className="mt-2 flex gap-2">
          <input type="hidden" name="question_id" value={questionId} />
          <input type="hidden" name="answer_id" value={answerId ?? ''} />
          <input name="body" required maxLength={500} className="input" placeholder={t('comment.placeholder')} />
          <button className="btn" type="submit">{t('comment.send')}</button>
        </form>
      </details>
    </div>
  );
}
