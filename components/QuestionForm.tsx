import { catName } from '@/lib/util';

export default function QuestionForm({
  action,
  cats,
  lang,
  t,
  defaults,
  id,
  error,
}: {
  action: (fd: FormData) => void | Promise<void>;
  cats: any[];
  lang: string;
  t: (k: string) => string;
  defaults?: { title: string; body: string; category_id: string; tags: string };
  id?: string;
  error?: string;
}) {
  return (
    <form action={action} className="card space-y-4">
      {id && <input type="hidden" name="id" value={id} />}
      {error && <p className="text-pink">{t(`err.${error}`)}</p>}
      <label className="block space-y-1">
        <span className="text-sm">{t('form.title')}</span>
        <input name="title" required minLength={15} maxLength={200} defaultValue={defaults?.title} className="input" dir="auto" placeholder={t('form.title.hint')} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">{t('form.body')}</span>
        <textarea name="body" required minLength={30} maxLength={10000} rows={10} defaultValue={defaults?.body} className="input" dir="auto" />
        <span className="muted">{t('form.body.hint')}</span>
      </label>
      <label className="block space-y-1">
        <span className="text-sm">{t('form.category')}</span>
        <select name="category" required className="input" defaultValue={defaults?.category_id ?? ''}>
          <option value="" disabled>—</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{catName(c, lang)}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm">{t('form.tags')}</span>
        <input name="tags" defaultValue={defaults?.tags} className="input" dir="auto" placeholder={t('form.tags.hint')} />
      </label>
      <button className="btn-primary" type="submit">{t('form.submit')}</button>
    </form>
  );
}
