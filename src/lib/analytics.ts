import type { Backend } from '../backend/tipos';
import { gravarLocal, lerLocal } from './idb';

// Estatísticas próprias e anônimas: um código aleatório do navegador, sem IP, nome ou e-mail.
const aleatorio = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

function visitante() {
  let v = lerLocal('me_visitante');
  if (!v) { v = aleatorio(); gravarLocal('me_visitante', v); }
  return v;
}

function sessao() {
  let s: { id?: string; t?: number } = {};
  try { s = JSON.parse(sessionStorage.getItem('me_sessao') || '{}'); } catch { /* nova */ }
  const agora = Date.now();
  if (!s.id || agora - (s.t || 0) > 25 * 60000) s = { id: aleatorio() };
  s.t = agora;
  try { sessionStorage.setItem('me_sessao', JSON.stringify(s)); } catch { /* sem armazenamento */ }
  return s.id!;
}

function origem() {
  try {
    const q = new URLSearchParams(location.search);
    const u = q.get('utm_source') || q.get('origem');
    if (u) return u.slice(0, 40);
    const r = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
    if (!r || r === location.hostname) return 'Direto';
    const mapa: [RegExp, string][] = [[/whatsapp|wa\.me/, 'WhatsApp'], [/instagram/, 'Instagram'], [/facebook|fb\.com/, 'Facebook'], [/google\./, 'Google'], [/tiktok/, 'TikTok'], [/t\.co$|twitter|x\.com/, 'X']];
    for (const [re, n] of mapa) if (re.test(r)) return n;
    return r.slice(0, 40);
  } catch {
    return 'Direto';
  }
}

export function iniciarAnalytics(backend: Backend) {
  const orig = origem();
  let atual = 'mapa';
  const bater = () => {
    if (document.hidden || atual === 'painel') return;
    const disp = matchMedia('(max-width: 820px)').matches ? 'celular' : 'computador';
    backend.registrarVisita(sessao(), visitante(), atual, disp, orig).catch(() => {});
  };
  setInterval(bater, 45000);
  document.addEventListener('visibilitychange', bater);
  return (pagina: string) => { atual = pagina; bater(); };
}
