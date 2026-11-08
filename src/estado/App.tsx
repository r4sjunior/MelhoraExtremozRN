import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { backend } from '../backend';
import { ErroRegra } from '../backend/tipos';
import { REGRAS_PADRAO } from '../dados/constantes';
import { carregarGeo, type Geo } from '../lib/geo';
import type { Patrocinio, Problema, Regras, Sessao } from '../types';

export type ModalId = 'intro' | 'tutorial' | 'login' | 'conta' | 'nome' | 'instalar' | { contato: string };

interface Ctx {
  geo: Geo | null;
  erroGeo: boolean;
  sessao: Sessao | null;
  carregouSessao: boolean;
  problemas: Problema[];
  carregouProblemas: boolean | 'erro';
  regras: Regras;
  patrocinios: Patrocinio[];
  meusApoios: Set<string>;
  minhasDenuncias: Set<string>;
  modal: ModalId | null;
  abrirModal: (m: ModalId | null) => void;
  aviso: (m: string) => void;
  /** Mostra a mensagem do erro de regra ou o texto padrão para falhas técnicas. */
  avisoErro: (e: unknown, padrao: string) => void;
  recarregar: () => Promise<void>;
  recarregarSessao: () => Promise<void>;
  apoiar: (id: string) => Promise<void>;
  denunciar: (id: string, motivo: string) => Promise<void>;
  /** Abre o login se não houver sessão; devolve true se pode seguir. */
  exigeLogin: () => boolean;
  podeParticipar: boolean;
}

const Contexto = createContext<Ctx | null>(null);
export const useApp = () => useContext(Contexto)!;

export function ProvedorApp({ children }: { children: ReactNode }) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [erroGeo, setErroGeo] = useState(false);
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregouSessao, setCarregouSessao] = useState(false);
  const [problemas, setProblemas] = useState<Problema[]>([]);
  const [carregouProblemas, setCarregou] = useState<boolean | 'erro'>(false);
  const [regras, setRegras] = useState<Regras>(REGRAS_PADRAO);
  const [patrocinios, setPatrocinios] = useState<Patrocinio[]>([]);
  const [meusApoios, setApoios] = useState<Set<string>>(new Set());
  const [minhasDenuncias, setDenuncias] = useState<Set<string>>(new Set());
  const [modal, abrirModal] = useState<ModalId | null>(null);
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const aviso = useCallback((m: string) => {
    setToast(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 4200);
  }, []);
  const avisoErro = useCallback((e: unknown, padrao: string) => {
    aviso(e instanceof ErroRegra ? e.message : padrao);
    if (!(e instanceof ErroRegra)) console.error(e);
  }, [aviso]);

  const recarregar = useCallback(async () => {
    try {
      const [p, r, pat] = await Promise.all([backend.problemas(), backend.regras(), backend.patrocinios()]);
      setProblemas(p);
      setRegras(r);
      setPatrocinios(pat);
      setCarregou(true);
    } catch (e) {
      console.error(e);
      setCarregou((c) => (c === true ? c : 'erro'));
    }
  }, []);

  const recarregarSessao = useCallback(async () => {
    try {
      const s = await backend.sessao();
      setSessao(s);
      const [a, d] = s ? await Promise.all([backend.meusApoios(), backend.minhasDenuncias()]) : [[], []];
      setApoios(new Set(a));
      setDenuncias(new Set(d));
    } catch (e) {
      console.error(e);
    } finally {
      setCarregouSessao(true);
    }
  }, []);

  useEffect(() => {
    carregarGeo().then(setGeo).catch((e) => { console.error(e); setErroGeo(true); });
    recarregarSessao().then(recarregar);
    backend.aoMudarSessao(() => { recarregarSessao().then(recarregar); });
    const sair = backend.assinarProblemas(() => { recarregar(); });
    const volta = () => { if (!document.hidden) recarregar(); };
    document.addEventListener('visibilitychange', volta);
    return () => { sair(); document.removeEventListener('visibilitychange', volta); };
  }, [recarregar, recarregarSessao]);

  // Depois de entrar, a pessoa escolhe como quer aparecer (uma vez por conta).
  useEffect(() => {
    if (sessao && !sessao.nomeEscolhido && !modal) abrirModal('nome');
  }, [sessao, modal]);

  const exigeLogin = useCallback(() => {
    if (sessao) return true;
    abrirModal('login');
    return false;
  }, [sessao]);

  const apoiar = useCallback(async (id: string) => {
    if (!exigeLogin()) return;
    const ligado = !meusApoios.has(id);
    // Resposta imediata na tela; se o servidor recusar, o estado volta.
    setApoios((s) => { const n = new Set(s); if (ligado) n.add(id); else n.delete(id); return n; });
    setProblemas((l) => l.map((p) => (p.id === id ? { ...p, apoios: p.apoios + (ligado ? 1 : -1) } : p)));
    try {
      await backend.apoiar(id, ligado);
    } catch (e) {
      setApoios((s) => { const n = new Set(s); if (ligado) n.delete(id); else n.add(id); return n; });
      setProblemas((l) => l.map((p) => (p.id === id ? { ...p, apoios: p.apoios + (ligado ? -1 : 1) } : p)));
      avisoErro(e, 'Não foi possível registrar o apoio.');
    }
  }, [exigeLogin, meusApoios, avisoErro]);

  const denunciar = useCallback(async (id: string, motivo: string) => {
    await backend.denunciar(id, motivo);
    setDenuncias((s) => new Set(s).add(id));
    await recarregar();
  }, [recarregar]);

  const valor = useMemo<Ctx>(() => ({
    geo, erroGeo, sessao, carregouSessao, problemas, carregouProblemas, regras, patrocinios, meusApoios, minhasDenuncias,
    modal, abrirModal, aviso, avisoErro, recarregar, recarregarSessao, apoiar, denunciar, exigeLogin,
    podeParticipar: !!sessao && !sessao.suspenso,
  }), [geo, erroGeo, sessao, carregouSessao, problemas, carregouProblemas, regras, patrocinios, meusApoios, minhasDenuncias, modal, aviso, avisoErro, recarregar, recarregarSessao, apoiar, denunciar, exigeLogin]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </Contexto.Provider>
  );
}

export const estaOculto = (p: Problema, r: Regras) => p.graves_pendentes > 0 || p.denuncias_pendentes >= r.denuncias_ocultar;
export const problemasVisiveis = (l: Problema[]) => l.filter((p) => p.status !== 'removido');
