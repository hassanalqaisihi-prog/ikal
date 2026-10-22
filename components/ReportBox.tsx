import { reportPost } from '@/app/actions';

export default function ReportBox({
  type,
  id,
  back,
  t,
}: {
  type: 'question' | 'answer' | 'comment';
  id: string;
  back: string;
  t: (k: string) => string;
}) {
  return (
    <details className="inline-block">
      <summary className="cursor-pointer text-sm text-mist/60 hover:text-pink">{t('report.link')}</summary>
      <form action={reportPost} className="card mt-2 space-y-2">
        <input type="hidden" name="target_type" value={type} />
        <input type="hidden" name="target_id" value={id} />
        <input type="hidden" name="back" value={back} />
        <select name="reason" className="input" defaultValue="spam">
          <option value="spam">{t('report.spam')}</option>
          <option value="offensive">{t('report.offensive')}</option>
          <option value="off_topic">{t('report.off_topic')}</option>
          <option value="other">{t('report.other')}</option>
        </select>
        <input name="note" maxLength={500} className="input" placeholder={t('report.note')} />
        <button className="btn" type="submit">{t('report.send')}</button>
      </form>
    </details>
  );
}
