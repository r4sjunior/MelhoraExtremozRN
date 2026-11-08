import { useEffect, useRef, useState, type JSX } from 'react';
import { backend } from './backend';
import { restaurarDadosDeTeste } from './backend/teste';
import { useApp } from './estado/App';
import { iniciarAnalytics } from './lib/analytics';
import { lerLocal } from './lib/idb';
import { navegar, paginaDe, useCaminho, type Pagina } from './lib/rota';
import MapaPagina from './mapa/MapaPagina';
import Cobrar from './paginas/Cobrar';
import { Privacidade, Termos } from './paginas/Legal';
import Painel from './paginas/Painel';
import Prioridades from './paginas/Prioridades';
import Sobre from './paginas/Sobre';
import { EspacoPatrocinio, Logo } from './ui/Comum';
import { Modais } from './ui/Modais';

const ABAS: [Pagina, string, string, JSX.Element][] = [
  ['mapa', '/', 'Mapa', <svg key="m" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.3-7-11.5A7 7 0 0 1 19 9.5C19 14.7 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>],
  ['prioridades', '/prioridades', 'Prioridades', <svg key="p" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>],
  ['cobrar', '/cobrar', 'Cobrar', <svg key="c" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h3l6 4V6L7 10H4z" /><path d="M17 9a4 4 0 0 1 0 6" /></svg>],
  ['sobre', '/sobre', 'Sobre', <svg key="s" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>],
];

export default function App() {
  const caminho = useCaminho();
  const { pagina, problemaId } = paginaDe(caminho);
  const { sessao, carregouSessao, abrirModal, modal } = useApp();
  const [promptInstalar, setPrompt] = useState<any>(null);
  const [instalado, setInstalado] = useState(() => matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
  const [testeOculto, setTesteOculto] = useState(false);
  const paginaAnalytics = useRef<((p: string) => void) | null>(null);

  useEffect(() => {
    paginaAnalytics.current = iniciarAnalytics(backend);
    const antes = (e: Event) => { e.preventDefault(); setPrompt(e); };
    const depois = () => { setInstalado(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', antes);
    window.addEventListener('appinstalled', depois);
    return () => { window.removeEventListener('beforeinstallprompt', antes); window.removeEventListener('appinstalled', depois); };
  }, []);

  useEffect(() => { paginaAnalytics.current?.(pagina); }, [pagina]);

  useEffect(() => {
    if (carregouSessao && !modal && !lerLocal('me_intro') && pagina === 'mapa' && !problemaId) abrirModal('intro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregouSessao]);

  const titulos: Partial<Record<Pagina, string>> = { prioridades: 'Prioridades', cobrar: 'Cobrar', sobre: 'Sobre', termos: 'Termos de uso', privacidade: 'Privacidade', painel: 'Painel' };
  useEffect(() => { document.title = titulos[pagina] ? `${titulos[pagina]} · Melhora Extremoz` : 'Melhora Extremoz RN'; }, [pagina]); // eslint-disable-line react-hooks/exhaustive-deps

  const primeiroNome = sessao ? (sessao.nome !== 'Morador(a)' ? sessao.nome.split(' ')[0] : 'Minha conta') : 'Entrar';

  return (
    <div className="casca">
      {backend.modo === 'teste' && !testeOculto && (
        <div className="faixa-teste" role="status">
          <span><b>Modo de teste:</b> dados fictícios, só neste navegador.</span>
          <button type="button" onClick={() => { if (confirm('Apagar tudo o que você fez no teste e voltar aos exemplos?')) restaurarDadosDeTeste(); }}>Restaurar exemplos</button>
          <button type="button" aria-label="Esconder aviso" onClick={() => setTesteOculto(true)}>×</button>
        </div>
      )}
      <EspacoPatrocinio espaco="topo" />
      <header className="topo">
        <button type="button" className="marca" onClick={() => navegar('/')} aria-label="Melhora Extremoz: ir para o mapa">
          <Logo />
          <span className="marca-texto"><b>Melhora <em>Extremoz</em></b><small>Marque no mapa, junte a vizinhança, cobre a solução</small></span>
        </button>
        <nav className="menu" aria-label="Seções">
          {ABAS.map(([k, url, nome]) => <button type="button" key={k} aria-current={pagina === k ? 'page' : undefined} onClick={() => navegar(url)}>{nome}</button>)}
          <button type="button" onClick={() => abrirModal('tutorial')}>Como usar</button>
        </nav>
        {!instalado && <button type="button" className="botao-instalar" onClick={() => abrirModal('instalar')}>App</button>}
        <button type="button" className={`botao-conta${sessao ? ' dentro' : ''}`} onClick={() => abrirModal(sessao ? 'conta' : 'login')} disabled={!carregouSessao}>{carregouSessao ? primeiroNome : '…'}</button>
        <button type="button" className="botao-ajuda" aria-label="Como usar" onClick={() => abrirModal('tutorial')}>?</button>
      </header>
      <div className="faixa-bandeira" aria-hidden="true"><i /><i /><i /></div>

      <MapaPagina ativo={pagina === 'mapa'} problemaId={problemaId} />
      {pagina === 'prioridades' && <Prioridades />}
      {pagina === 'cobrar' && <Cobrar />}
      {pagina === 'sobre' && <Sobre />}
      {pagina === 'termos' && <Termos />}
      {pagina === 'privacidade' && <Privacidade />}
      {pagina === 'painel' && <Painel />}

      <nav className="abas" aria-label="Seções">
        {ABAS.map(([k, url, nome, icone]) => <button type="button" key={k} aria-current={pagina === k ? 'page' : undefined} onClick={() => navegar(url)}>{icone}{nome}</button>)}
      </nav>
      <Modais promptInstalar={promptInstalar} limparPrompt={() => setPrompt(null)} />
    </div>
  );
}
