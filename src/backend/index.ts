import { criarBackendSupabase } from './supabase';
import { criarBackendTeste } from './teste';
import type { Backend } from './tipos';

const E = import.meta.env;
const url = ((E.VITE_SUPABASE_URL || E.NEXT_PUBLIC_SUPABASE_URL) as string | undefined)?.trim();
const chave = ((E.VITE_SUPABASE_ANON_KEY || E.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || E.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined)?.trim();
const captcha = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || '';

export const backend: Backend = url && chave ? criarBackendSupabase(url, chave, captcha) : criarBackendTeste();
