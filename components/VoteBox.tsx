import { vote } from '@/app/actions';

export default function VoteBox({
  kind,
  id,
  score,
  mine,
  back,
}: {
  kind: 'question' | 'answer';
  id: string;
  score: number;
  mine: number;
  back: string;
}) {
  const btn = (v: 1 | -1) => (
    <form action={vote}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="value" value={String(v)} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        aria-label={v === 1 ? 'upvote' : 'downvote'}
        className={`h-9 w-9 rounded-lg border text-base ${
          mine === v ? 'border-xenon text-xenon' : 'border-white/15 text-mist/60 hover:border-nebula'
        }`}
      >
        {v === 1 ? '▲' : '▼'}
      </button>
    </form>
  );
  return (
    <div className="flex flex-col items-center gap-1">
      {btn(1)}
      <span className="text-lg font-bold">{score}</span>
      {btn(-1)}
    </div>
  );
}
