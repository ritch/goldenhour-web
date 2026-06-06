import { NextResponse } from 'next/server';
import { ensureOAuthProfile } from '@/lib/oauthProfile';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/write';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const type = searchParams.get('type');
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  if (data.user) {
    await ensureOAuthProfile(data.user);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
