import 'server-only';
import { Resend } from 'resend';
import { makeT, type Lang } from './dict';

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is missing: email skipped.');
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'Ikal <onboarding@resend.dev>',
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) console.error('Resend error:', error);
  } catch (e) {
    console.error('Email failed:', e);
  }
}

export function renderMail(
  lang: Lang,
  o: { heading: string; text?: string; snippet?: string; button?: string; url?: string; footer?: string }
) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return `<div dir="${dir}" style="background:#0B0A14;padding:24px;font-family:Tahoma,Arial,sans-serif;color:#EDEBFF">
  <div style="max-width:520px;margin:auto;background:#16142A;border:1px solid #2a2750;border-radius:16px;padding:24px">
    <div style="font-size:22px;font-weight:700;color:#C6FF3D">عكال · Ikal</div>
    <h2 style="margin:16px 0 8px;font-size:18px">${esc(o.heading)}</h2>
    ${o.text ? `<p style="line-height:1.7;margin:0 0 12px">${esc(o.text)}</p>` : ''}
    ${o.snippet ? `<blockquote style="margin:0 0 16px;padding:10px 14px;border-inline-start:3px solid #7A3CFF;background:#0B0A14;border-radius:8px;line-height:1.7">${esc(o.snippet)}</blockquote>` : ''}
    ${o.button && o.url ? `<a href="${esc(o.url)}" style="display:inline-block;background:#7A3CFF;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:700">${esc(o.button)}</a>` : ''}
    ${o.footer ? `<p style="margin-top:20px;font-size:12px;color:#9a97b8">${esc(o.footer)}</p>` : ''}
  </div></div>`;
}

export function welcomeMail(lang: Lang, name: string, siteUrl: string) {
  const t = makeT(lang);
  return {
    subject: t('mail.welcome.subject'),
    html: renderMail(lang, {
      heading: `${t('mail.welcome.heading')} ${name}`,
      text: t('mail.welcome.text'),
      button: t('mail.welcome.button'),
      url: `${siteUrl}/ask`,
      footer: `${t('mail.rules')}: ${siteUrl}/rules`,
    }),
  };
}

export function eventMail(
  lang: Lang,
  type: 'answer' | 'comment' | 'accepted',
  o: { title: string; snippet?: string; url: string; actor: string; siteUrl: string }
) {
  const t = makeT(lang);
  return {
    subject: `${t(`mail.${type}.subject`)}: ${o.title}`,
    html: renderMail(lang, {
      heading: `${o.actor} ${t(`mail.${type}.heading`)}`,
      text: o.title,
      snippet: o.snippet,
      button: t('mail.open'),
      url: o.url,
      footer: `${t('mail.settings')}: ${o.siteUrl}/settings`,
    }),
  };
}

export function reportMail(o: { reason: string; note: string; url: string; adminUrl: string }) {
  return {
    subject: 'Ikal: new report / بلاغ جديد',
    html: renderMail('en', {
      heading: 'New report / بلاغ جديد',
      text: `Reason: ${o.reason}`,
      snippet: o.note || undefined,
      button: 'Open admin / فتح الإدارة',
      url: o.adminUrl,
      footer: o.url,
    }),
  };
}
