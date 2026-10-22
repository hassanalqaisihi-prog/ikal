import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWelcomeIfNew } from '@/lib/notify';
import { safePath } from '@/lib/util';

// Supabase sends people here after they click the confirm-email or reset-password link.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safePath(url.searchParams.get('next'), '/');
  if (code) {
    const sb = createClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user && next !== '/reset') await sendWelcomeIfNew(user.id);
      return NextResponse.redirect(new URL(next === '/' ? '/?welcome=1' : next, url.origin));
    }
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin));
}
