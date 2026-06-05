export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ??
    process.env.SUPABASE_URL?.trim() ??
    ''
  );
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_CLIENT_API_KEY?.trim() ??
    process.env.SUPABASE_CLIENT_API_KEY?.trim() ??
    ''
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function getHarnessUrl(): string {
  const override = process.env.NEXT_PUBLIC_LLM_SERVER_URL?.trim();
  if (override) return override.replace(/\/$/, '');
  const url = getSupabaseUrl();
  if (!url) return '';
  return `${url.replace(/\/$/, '')}/functions/v1/llm-harness`;
}

export function isHarnessConfigured(): boolean {
  return Boolean(getHarnessUrl());
}
