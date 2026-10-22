import { cookies } from 'next/headers';
import { makeT, type Lang } from './dict';

export function getLang(): Lang {
  return cookies().get('lang')?.value === 'en' ? 'en' : 'ar';
}

export function getT() {
  const lang = getLang();
  return { lang, t: makeT(lang) };
}
