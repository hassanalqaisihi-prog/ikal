export function fmtDate(d: string | Date, lang: string) {
  return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-IQ' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Only allow redirects to paths inside this site.
export function safePath(p: string | null | undefined, fallback = '/') {
  if (!p) return fallback;
  return p.startsWith('/') && !p.startsWith('//') && !p.includes('\\') ? p : fallback;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function catName(c: any, lang: string) {
  return c ? (lang === 'ar' ? c.name_ar : c.name_en) : '';
}

export function snippet(s: string, n = 160) {
  const x = s.replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim();
  return x.length > n ? x.slice(0, n) + '…' : x;
}

export function qs(params: Record<string, string | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `?${s}` : '';
}

export function withParam(path: string, key: string, val: string) {
  const [base, hash] = path.split('#');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${key}=${encodeURIComponent(val)}${hash ? '#' + hash : ''}`;
}
