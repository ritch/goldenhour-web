import { getHarnessUrl, getSupabaseAnonKey } from '@/lib/config';

export function harnessAuthHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  const serverUrl = getHarnessUrl();
  const apikey = getSupabaseAnonKey();
  if (apikey && serverUrl.includes('/functions/v1/')) {
    headers.apikey = apikey;
  }
  return headers;
}
