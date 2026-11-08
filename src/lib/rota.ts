import { useSyncExternalStore } from 'react';

// Roteador mínimo sobre a History API.
const ouvintes = new Set<() => void>();
const avisa = () => ouvintes.forEach((f) => f());
window.addEventListener('popstate', avisa);

export function navegar(caminho: string, substituir = false) {
  if (location.pathname + location.search === caminho) return;
  if (substituir) history.replaceState(null, '', caminho);
  else history.pushState(null, '', caminho);
  avisa();
  window.scrollTo(0, 0);
}

export function useCaminho(): string {
  return useSyncExternalStore(
    (f) => { ouvintes.add(f); return () => ouvintes.delete(f); },
    () => location.pathname.replace(/\/+$/, '') || '/',
  );
}

export type Pagina = 'mapa' | 'prioridades' | 'cobrar' | 'sobre' | 'termos' | 'privacidade' | 'painel';

export function paginaDe(caminho: string): { pagina: Pagina; problemaId: string | null } {
  const m = caminho.match(/^\/problema\/([0-9a-zA-Z-]{1,60})$/);
  if (m) return { pagina: 'mapa', problemaId: m[1] };
  const mapa: Record<string, Pagina> = { '/prioridades': 'prioridades', '/cobrar': 'cobrar', '/sobre': 'sobre', '/termos': 'termos', '/privacidade': 'privacidade', '/painel': 'painel' };
  return { pagina: mapa[caminho] || 'mapa', problemaId: null };
}
