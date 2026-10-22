import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { getT } from '@/lib/i18n';
import QuestionForm from '@/components/QuestionForm';
import { updateQuestion } from '@/app/actions';

export default async function EditQuestion({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const { lang, t } = getT();
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/login?next=/q/${params.id}/edit`);
  const { data: q } = await sb
    .from('questions')
    .select('*, question_tags(tags(name))')
    .eq('id', params.id)
    .maybeSingle();
  if (!q || q.author_id !== user.id) notFound();
  const { data: cats } = await sb.from('categories').select('*').eq('is_hidden', false).order('sort_order');
  const tags = ((q.question_tags ?? []) as any[]).map((x) => x.tags?.name).filter(Boolean).join(', ');
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t('post.edit')}</h1>
      <QuestionForm
        action={updateQuestion}
        cats={(cats ?? []) as any[]}
        lang={lang}
        t={t}
        id={q.id}
        error={searchParams.error}
        defaults={{ title: q.title, body: q.body, category_id: q.category_id, tags }}
      />
    </div>
  );
}
