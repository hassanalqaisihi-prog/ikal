'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';
import { sendMail, reportMail } from '@/lib/email';
import { safePath, siteUrl, snippet, withParam } from '@/lib/util';

// ---------- helpers (not exported: this file only exports server actions) ----------
function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim();
}

async function getUser() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { sb, user };
}

function toLogin(back: string): never {
  redirect(`/login?next=${encodeURIComponent(back)}`);
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function saveTags(sb: ReturnType<typeof createClient>, questionId: string, raw: string) {
  const names = Array.from(
    new Set(
      raw
        .split(/[,،]/)
        .map((s) => s.trim().toLowerCase().replace(/\s+/g, '-'))
        .filter((s) => s.length >= 1 && s.length <= 30)
    )
  ).slice(0, 5);
  await sb.from('question_tags').delete().eq('question_id', questionId);
  if (!names.length) return;
  await sb.from('tags').upsert(names.map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true });
  const { data: rows } = await sb.from('tags').select('id,name').in('name', names);
  const links = ((rows ?? []) as any[]).map((r) => ({ question_id: questionId, tag_id: r.id }));
  if (links.length) await sb.from('question_tags').insert(links);
}

// ---------- language ----------
export async function setLang(fd: FormData) {
  const lang = str(fd, 'lang') === 'en' ? 'en' : 'ar';
  cookies().set('lang', lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  const { sb, user } = await getUser();
  if (user) await sb.from('profiles').update({ language: lang }).eq('id', user.id);
  let back = '/';
  const ref = headers().get('referer');
  if (ref) {
    try {
      const u = new URL(ref);
      back = safePath(u.pathname + u.search);
    } catch {}
  }
  redirect(back);
}

// ---------- auth ----------
export async function signUp(fd: FormData) {
  if (str(fd, 'website')) redirect('/signup?sent=1'); // honeypot: bots fill this hidden field
  const name = str(fd, 'name');
  const email = str(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  if (name.length < 2 || name.length > 40 || !email.includes('@') || password.length < 8) {
    redirect('/signup?error=weak');
  }
  const lang = cookies().get('lang')?.value === 'en' ? 'en' : 'ar';
  const sb = createClient();
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name, language: lang },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });
  if (error) redirect(`/signup?error=${/registered|exists/i.test(error.message) ? 'exists' : 'generic'}`);
  redirect('/signup?sent=1');
}

export async function logIn(fd: FormData) {
  const email = str(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  const next = safePath(str(fd, 'next'));
  const sb = createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const unconfirmed = /confirm/i.test(error.message);
    redirect(
      `/login?error=${unconfirmed ? 'unconfirmed' : 'bad'}&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
    );
  }
  redirect(next);
}

export async function signOut() {
  const sb = createClient();
  await sb.auth.signOut();
  redirect('/');
}

export async function resendConfirmation(fd: FormData) {
  const email = str(fd, 'email').toLowerCase();
  const sb = createClient();
  await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${siteUrl()}/auth/callback` } });
  redirect('/login?sent=1');
}

export async function forgotPassword(fd: FormData) {
  const email = str(fd, 'email').toLowerCase();
  const sb = createClient();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/reset` });
  redirect('/forgot?sent=1'); // always the same answer, so nobody can probe which emails exist
}

export async function resetPassword(fd: FormData) {
  const password = String(fd.get('password') ?? '');
  const { sb, user } = await getUser();
  if (!user) redirect('/login?error=link');
  if (password.length < 8) redirect('/reset?error=weak');
  const { error } = await sb.auth.updateUser({ password });
  if (error) redirect('/reset?error=generic');
  redirect('/?pw=1');
}

// ---------- questions ----------
export async function askQuestion(fd: FormData) {
  const { sb, user } = await getUser();
  if (!user) toLogin('/ask');
  const title = str(fd, 'title');
  const body = str(fd, 'body');
  const category = str(fd, 'category');
  if (title.length < 15 || title.length > 200 || body.length < 30 || body.length > 10000 || !isUuid(category)) {
    redirect('/ask?error=short');
  }
  const { data, error } = await sb
    .from('questions')
    .insert({ author_id: user.id, title, body, category_id: category })
    .select('id')
    .single();
  if (error || !data) redirect(`/ask?error=${error?.message.includes('rate_limit') ? 'rate' : 'generic'}`);
  await saveTags(sb, data.id, str(fd, 'tags'));
  redirect(`/q/${data.id}`);
}

export async function updateQuestion(fd: FormData) {
  const id = str(fd, 'id');
  const { sb, user } = await getUser();
  if (!user) toLogin(`/q/${id}/edit`);
  const title = str(fd, 'title');
  const body = str(fd, 'body');
  const category = str(fd, 'category');
  if (!isUuid(id) || title.length < 15 || body.length < 30 || !isUuid(category)) {
    redirect(`/q/${id}/edit?error=short`);
  }
  const { error } = await sb
    .from('questions')
    .update({ title, body, category_id: category })
    .eq('id', id)
    .eq('author_id', user.id);
  if (error) redirect(`/q/${id}/edit?error=generic`);
  await saveTags(sb, id, str(fd, 'tags'));
  redirect(`/q/${id}`);
}

export async function deleteQuestion(fd: FormData) {
  const id = str(fd, 'id');
  const { sb, user } = await getUser();
  if (!user) toLogin(`/q/${id}`);
  await sb.from('questions').update({ status: 'deleted' }).eq('id', id).eq('author_id', user.id);
  redirect('/');
}

// ---------- answers ----------
export async function addAnswer(fd: FormData) {
  const qid = str(fd, 'question_id');
  const back = `/q/${qid}`;
  const { sb, user } = await getUser();
  if (!user) toLogin(back);
  const body = str(fd, 'body');
  if (!isUuid(qid) || body.length < 20 || body.length > 10000) redirect(withParam(back, 'error', 'short_answer'));
  const { data, error } = await sb
    .from('answers')
    .insert({ question_id: qid, author_id: user.id, body })
    .select('id')
    .single();
  if (error || !data) {
    const code = error?.code === '23505' ? 'dup' : error?.message.includes('rate_limit') ? 'rate' : 'generic';
    redirect(withParam(back, 'error', code));
  }
  const { data: q } = await sb.from('questions').select('title,author_id').eq('id', qid).single();
  const { data: me } = await sb.from('profiles').select('display_name').eq('id', user.id).single();
  if (q && q.author_id !== user.id) {
    await notifyUser(q.author_id, 'answer', {
      title: q.title,
      snippet: snippet(body, 200),
      url: `${siteUrl()}/q/${qid}#a-${data.id}`,
      actor: me?.display_name ?? '',
    });
  }
  redirect(`${back}#a-${data.id}`);
}

export async function updateAnswer(fd: FormData) {
  const id = str(fd, 'id');
  const qid = str(fd, 'question_id');
  const back = `/q/${qid}`;
  const { sb, user } = await getUser();
  if (!user) toLogin(back);
  const body = str(fd, 'body');
  if (body.length < 20) redirect(withParam(back, 'error', 'short_answer'));
  await sb.from('answers').update({ body }).eq('id', id).eq('author_id', user.id);
  redirect(`${back}#a-${id}`);
}

export async function deleteAnswer(fd: FormData) {
  const id = str(fd, 'id');
  const qid = str(fd, 'question_id');
  const { sb, user } = await getUser();
  if (!user) toLogin(`/q/${qid}`);
  await sb.from('answers').delete().eq('id', id).eq('author_id', user.id);
  redirect(`/q/${qid}`);
}

export async function acceptAnswer(fd: FormData) {
  const id = str(fd, 'id');
  const qid = str(fd, 'question_id');
  const back = `/q/${qid}`;
  const { sb, user } = await getUser();
  if (!user) toLogin(back);
  const { error } = await sb.rpc('accept_answer', { p_answer: id });
  if (error) redirect(withParam(back, 'error', 'generic'));
  const { data: q } = await sb.from('questions').select('title,accepted_answer_id').eq('id', qid).single();
  const { data: a } = await sb.from('answers').select('author_id').eq('id', id).single();
  if (q && a && q.accepted_answer_id === id && a.author_id !== user.id) {
    const { data: me } = await sb.from('profiles').select('display_name').eq('id', user.id).single();
    await notifyUser(a.author_id, 'accepted', {
      title: q.title,
      url: `${siteUrl()}/q/${qid}#a-${id}`,
      actor: me?.display_name ?? '',
    });
  }
  redirect(`${back}#a-${id}`);
}

// ---------- comments ----------
export async function addComment(fd: FormData) {
  const qid = str(fd, 'question_id');
  const aid = str(fd, 'answer_id');
  const back = `/q/${qid}`;
  const { sb, user } = await getUser();
  if (!user) toLogin(back);
  const body = str(fd, 'body');
  if (!isUuid(qid) || body.length < 1 || body.length > 500) redirect(withParam(back, 'error', 'short_comment'));
  const { error } = await sb
    .from('comments')
    .insert({ author_id: user.id, question_id: qid, answer_id: aid && isUuid(aid) ? aid : null, body });
  if (error) redirect(withParam(back, 'error', error.message.includes('rate_limit') ? 'rate' : 'generic'));

  const { data: q } = await sb.from('questions').select('title,author_id').eq('id', qid).single();
  let targetId: string | undefined = q?.author_id;
  if (aid && isUuid(aid)) {
    const { data: a } = await sb.from('answers').select('author_id').eq('id', aid).single();
    targetId = a?.author_id;
  }
  if (q && targetId && targetId !== user.id) {
    const { data: me } = await sb.from('profiles').select('display_name').eq('id', user.id).single();
    await notifyUser(targetId, 'comment', {
      title: q.title,
      snippet: snippet(body, 200),
      url: `${siteUrl()}/q/${qid}${aid ? `#a-${aid}` : ''}`,
      actor: me?.display_name ?? '',
    });
  }
  redirect(back + (aid ? `#a-${aid}` : ''));
}

export async function deleteComment(fd: FormData) {
  const id = str(fd, 'id');
  const qid = str(fd, 'question_id');
  const { sb, user } = await getUser();
  if (!user) toLogin(`/q/${qid}`);
  await sb.from('comments').delete().eq('id', id); // RLS: only the author or an admin
  redirect(`/q/${qid}`);
}

// ---------- votes ----------
export async function vote(fd: FormData) {
  const back = safePath(str(fd, 'back'));
  const { sb, user } = await getUser();
  if (!user) toLogin(back);
  const kind = str(fd, 'kind') === 'answer' ? 'answer' : 'question';
  const id = str(fd, 'id');
  const value = str(fd, 'value') === '-1' ? -1 : 1;
  if (!isUuid(id)) redirect(back);
  const col = kind === 'answer' ? 'answer_id' : 'question_id';
  const { data: ex } = await sb.from('votes').select('id,value').eq('user_id', user.id).eq(col, id).maybeSingle();
  let error: { message: string } | null = null;
  if (ex && ex.value === value) {
    ({ error } = await sb.from('votes').delete().eq('id', ex.id));
  } else if (ex) {
    ({ error } = await sb.from('votes').update({ value }).eq('id', ex.id));
  } else {
    ({ error } = await sb.from('votes').insert({ user_id: user.id, [col]: id, value }));
  }
  if (error) redirect(withParam(back, 'error', error.message.includes('own post') ? 'self' : 'generic'));
  redirect(back);
}

// ---------- reports ----------
export async function reportPost(fd: FormData) {
  const back = safePath(str(fd, 'back'));
  const { sb, user } = await getUser();
  if (!user) toLogin(back);
  const type = str(fd, 'target_type');
  const id = str(fd, 'target_id');
  const reason = str(fd, 'reason');
  const note = str(fd, 'note').slice(0, 500);
  if (!['question', 'answer', 'comment'].includes(type) || !isUuid(id) || !['spam', 'offensive', 'off_topic', 'other'].includes(reason)) {
    redirect(back);
  }
  const { error } = await sb.from('reports').insert({ reporter_id: user.id, target_type: type, target_id: id, reason, note });
  if (error) redirect(withParam(back, 'error', 'generic'));
  if (process.env.ADMIN_EMAIL) {
    const mail = reportMail({ reason, note, url: `${siteUrl()}${back}`, adminUrl: `${siteUrl()}/admin` });
    await sendMail({ to: process.env.ADMIN_EMAIL, ...mail });
  }
  redirect(withParam(back, 'reported', '1'));
}

// ---------- settings ----------
export async function updateSettings(fd: FormData) {
  const { sb, user } = await getUser();
  if (!user) toLogin('/settings');
  const name = str(fd, 'display_name');
  const lang = str(fd, 'language') === 'en' ? 'en' : 'ar';
  if (name.length < 2 || name.length > 40) redirect('/settings?error=name');
  const { error } = await sb
    .from('profiles')
    .update({
      display_name: name,
      bio: str(fd, 'bio').slice(0, 300),
      language: lang,
      email_on_answer: fd.get('email_on_answer') === 'on',
      email_on_comment: fd.get('email_on_comment') === 'on',
      email_on_accepted: fd.get('email_on_accepted') === 'on',
    })
    .eq('id', user.id);
  if (error) redirect('/settings?error=generic');
  cookies().set('lang', lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  redirect('/settings?saved=1');
}

export async function changePassword(fd: FormData) {
  const { sb, user } = await getUser();
  if (!user) toLogin('/settings');
  const password = String(fd.get('password') ?? '');
  if (password.length < 8) redirect('/settings?error=weak');
  const { error } = await sb.auth.updateUser({ password });
  redirect(error ? '/settings?error=generic' : '/settings?saved=1');
}

export async function changeEmail(fd: FormData) {
  const { sb, user } = await getUser();
  if (!user) toLogin('/settings');
  const email = str(fd, 'email').toLowerCase();
  if (!email.includes('@')) redirect('/settings?error=generic');
  const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: `${siteUrl()}/auth/callback` });
  redirect(error ? '/settings?error=generic' : '/settings?emailsent=1');
}

// ---------- admin ----------
async function requireAdmin() {
  const { sb, user } = await getUser();
  if (!user) toLogin('/admin');
  const { data: p } = await sb.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!p?.is_admin) redirect('/');
  return { sb, user };
}

export async function resolveReport(fd: FormData) {
  const { sb, user } = await requireAdmin();
  const reportId = str(fd, 'report_id');
  const action = str(fd, 'action') === 'hide' ? 'hide' : 'dismiss';
  const { data: r } = await sb.from('reports').select('*').eq('id', reportId).single();
  if (r) {
    if (action === 'hide') {
      const table = r.target_type === 'question' ? 'questions' : r.target_type === 'answer' ? 'answers' : 'comments';
      await sb.from(table).update({ status: 'hidden' }).eq('id', r.target_id);
    }
    await sb
      .from('reports')
      .update({ status: action === 'hide' ? 'hidden' : 'dismissed', handled_by: user.id })
      .eq('id', reportId);
  }
  redirect('/admin');
}

export async function saveCategory(fd: FormData) {
  const { sb } = await requireAdmin();
  const id = str(fd, 'id');
  const name_ar = str(fd, 'name_ar');
  const name_en = str(fd, 'name_en');
  const sort_order = parseInt(str(fd, 'sort_order') || '0', 10) || 0;
  const is_hidden = fd.get('is_hidden') === 'on';
  if (!name_ar || !name_en) redirect('/admin?error=name');
  if (id) {
    await sb.from('categories').update({ name_ar, name_en, sort_order, is_hidden }).eq('id', id);
  } else {
    const slug =
      name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${Date.now()}`;
    await sb.from('categories').insert({ name_ar, name_en, slug, sort_order, is_hidden });
  }
  redirect('/admin');
}

// ---------- notifications ----------
export async function markNotificationsRead() {
  const { sb, user } = await getUser();
  if (!user) toLogin('/notifications');
  await sb.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  redirect('/notifications');
}
