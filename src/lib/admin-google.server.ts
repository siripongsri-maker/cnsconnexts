import { createClient } from '@supabase/supabase-js';
import { getRequest } from '@tanstack/react-start/server';
import type { Database } from '@/integrations/supabase/types';
import { ALL_ROLES, type AdminRole } from './admin-session';

/** Revalidate the Google identity and role with the caller's bearer, never an admin client. */
export async function validateGoogleAdmin(userId: string): Promise<AdminRole | null> {
  const bearer = getRequest().headers.get('authorization');
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key || !bearer?.startsWith('Bearer ')) return null;
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: bearer },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const { data, error } = await client.auth.getUser(bearer.slice(7));
  if (error || data.user?.id !== userId || !data.user.identities?.some(i => i.provider === 'google')) return null;
  const roles = await client.from('user_roles').select('role').eq('user_id', userId);
  if (roles.error) return null;
  return ALL_ROLES.find(role => roles.data?.some(row => row.role === role)) ?? null;
}