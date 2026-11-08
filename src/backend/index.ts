import { criarBackendSupabase } from './supabase';
import { criarBackendTeste } from './teste';
import type { Backend } from './tipos';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const chave = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
const captcha = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || '';

export const backend: Backend = url && chave ? criarBackendSupabase(url, chave, captcha) : criarBackendTeste();
