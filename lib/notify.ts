import 'server-only';
import { createAdminClient } from './supabase/admin';
import { sendMail, eventMail, welcomeMail } from './email';
import { siteUrl } from './util';
import type { Lang } from './dict';

// Sends the email version of a notification, if the recipient allows it.
export async function notifyUser(
  userId: string,
  type: 'answer' | 'comment' | 'accepted',
  info: { title: string; snippet?: string; url: string; actor: string }
) {
  try {
    const admin = createAdminClient();
    const { data: p } = await admin
      .from('profiles')
      .select('language,email_on_answer,email_on_comment,email_on_accepted')
      .eq('id', userId)
      .single();
    if (!p) return;
    const allowed =
      (type === 'answer' && p.email_on_answer) ||
      (type === 'comment' && p.email_on_comment) ||
      (type === 'accepted' && p.email_on_accepted);
    if (!allowed) return;
    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data.user?.email;
    if (!email) return;
    const mail = eventMail((p.language as Lang) ?? 'ar', type, { ...info, siteUrl: siteUrl() });
    await sendMail({ to: email, ...mail });
  } catch (e) {
    console.error('notifyUser failed:', e);
  }
}

// Sends the welcome email once, the first time a confirmed user lands in the app.
export async function sendWelcomeIfNew(userId: string) {
  try {
    const admin = createAdminClient();
    const { data: p } = await admin
      .from('profiles')
      .select('display_name,language,welcomed')
      .eq('id', userId)
      .single();
    if (!p || p.welcomed) return;
    await admin.from('profiles').update({ welcomed: true }).eq('id', userId);
    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data.user?.email;
    if (!email) return;
    const mail = welcomeMail((p.language as Lang) ?? 'ar', p.display_name, siteUrl());
    await sendMail({ to: email, ...mail });
  } catch (e) {
    console.error('sendWelcomeIfNew failed:', e);
  }
}
