import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getT } from '@/lib/i18n';
import QuestionForm from '@/components/QuestionForm';
import { askQuestion } from '@/app/actions';

export default async function AskPage({ searchParams }: { searchParams: { error?: string } }) {
  const { lang, t } = getT();
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login?next=/ask');
  const { data: cats } = await sb.from('categories').select('*').eq('is_hidden', false).order('sort_order');
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.ask')}</h1>
      <QuestionForm action={askQuestion} cats={(cats ?? []) as any[]} lang={lang} t={t} error={searchParams.error} />
    </div>
  );
}
