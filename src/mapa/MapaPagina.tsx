import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointer } from 'react';
import { CORES_APOIO, DIST_SEM_ENDERECO_M, FAIXAS_APOIO, ZOOM_MINIMO_APONTAR } from '../dados/constantes';
import { estaOculto, problemasVisiveis, useApp } from '../estado/App';
import { dentroDoMunicipio, enderecoMaisProximo, limitesDaLocalidade, limitesDaRua, pontoDoNumero, referenciaProxima, zonaEm, type Geo } from '../lib/geo';
import { idbApagar, idbGravar, idbLer } from '../lib/idb';
import { navegar } from '../lib/rota';
import type { ZonaId } from '../types';
import MapView, { type MapaApi } from './MapView';
import { Detalhe } from './Detalhe';
import { Inicio, type Filtro } from './Inicio';
import { NovoProblemaForm, type Rascunho, type RascunhoFoto } from './NovoProblema';

const CHAVE_RASCUNHO = 'rascunho';
const SETE_DIAS = 7 * 86400000;
type NivelGaveta = 'baixo' | 'meio' | 'alto';

function useEhCelular() {
  const [c, setC] = useState(() => matchMedia('(max-width: 820px)').matches);
  useEffect(() => {
    const m = matchMedia('(max-width: 820px)');
    const f = () => setC(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return c;
}

/** Traduz um ponto do mapa em endereço: via e número do cadastro, ou "sem endereço" em áreas não cadastradas. */
export function resolverEndereco(geo: Geo, lon: number, lat: number) {
  const e = enderecoMaisProximo(geo, lon, lat);
  const ref = referenciaProxima(geo, lon, lat);
  if (!e) return { via: 'Local sem endereço cadastrado', numero: '', localidade: 'Extremoz', zona: (zonaEm(geo, lon, lat) || 'sede') as ZonaId, semEndereco: true, ruaIdx: -1, sugestao: ref ? `Perto de ${ref.n}` : '' };
  const rua = geo.ruas[e.ruaIdx];
  const loc = geo.localidades[rua[1]];
  if (e.dist > DIST_SEM_ENDERECO_M) {
    return { via: 'Local sem endereço cadastrado', numero: '', localidade: loc.n, zona: zonaEm(geo, lon, lat) || loc.z, semEndereco: true, ruaIdx: -1, sugestao: ref ? `Perto de ${ref.n}` : '' };
  }
  return { via: rua[0], numero: e.numero ? String(e.numero) : '', localidade: loc.n, zona: loc.z, semEndereco: false, ruaIdx: e.ruaIdx, sugestao: '' };
}

export default function MapaPagina({ ativo, problemaId }: { ativo: boolean; problemaId: string | null }) {
  const { geo, erroGeo, problemas, regras, sessao, carregouSessao, aviso } = useApp();
  const celular = useEhCelular();
  const api = useRef<MapaApi>(null);
  const [filtro, setFiltro] = useState<Filtro>({ zona: '', localidade: -1, categoria: '', ruaIdx: -1, numero: null });
  const [rascunho, setRascunhoBruto] = useState<Rascunho | null>(null);
  const [gaveta, setGaveta] = useState<NivelGaveta>('baixo');
  const caixa = useRef<HTMLElement>(null);
  const [alturaArea, setAlturaArea] = useState(600);
  const [arrasteH, setArrasteH] = useState<number | null>(null);

  const alturas = useMemo(() => ({ baixo: Math.min(150, alturaArea * 0.32), meio: Math.round(alturaArea * 0.55), alto: alturaArea - 8 }), [alturaArea]);
  const alturaGaveta = arrasteH ?? alturas[gaveta];

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { if (el.clientHeight) setAlturaArea(el.clientHeight); api.current?.redimensionar(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // O mapa pode ter nascido oculto (entrada direta por outra aba): ao aparecer, reajusta e enquadra a cidade.
  const jaApareceu = useRef(ativo);
  useEffect(() => {
    if (!ativo) return;
    setTimeout(() => {
      api.current?.redimensionar();
      if (!jaApareceu.current) { jaApareceu.current = true; if (!problemaId) api.current?.visaoGeral(); }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  // ---------- rascunho guardado no aparelho ----------
  const gravar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setRascunho = useCallback((r: Rascunho | null | ((x: Rascunho | null) => Rascunho | null)) => {
    setRascunhoBruto((atual) => {
      const novo = typeof r === 'function' ? r(atual) : r;
      clearTimeout(gravar.current);
      if (novo) {
        gravar.current = setTimeout(() => {
          const { fotos, ...resto } = novo;
          idbGravar(CHAVE_RASCUNHO, { ...resto, salvo: Date.now(), fotos: fotos.map((f) => ({ blob: f.blob, caminho: f.caminho })) });
        }, 300);
      } else idbApagar(CHAVE_RASCUNHO);
      return novo;
    });
  }, []);

  const restaurado = useRef(false);
  useEffect(() => {
    if (restaurado.current || !geo || !carregouSessao) return;
    restaurado.current = true;
    idbLer<any>(CHAVE_RASCUNHO).then((r) => {
      if (!r) return;
      if (Date.now() - (r.salvo || 0) > SETE_DIAS) { idbApagar(CHAVE_RASCUNHO); return; }
      const fotos: RascunhoFoto[] = (r.fotos || []).map((f: any) => ({ blob: f.blob, caminho: f.caminho, url: f.blob ? URL.createObjectURL(f.blob) : '' }));
      setRascunhoBruto({ ...r, fotos });
      setGaveta('meio');
      setTimeout(() => api.current?.voar(r.lon, r.lat, 17), 600);
      aviso(r.pendente ? 'Você tem um problema esperando internet.' : 'Recuperamos o problema que você estava apontando.');
    });
  }, [geo, carregouSessao, aviso]);

  // Vindo da busca, a via e o número são os que a pessoa escolheu, não os do endereço mais próximo do ponto estimado.
  const iniciarEm = useCallback((lon: number, lat: number, escolhido?: { ruaIdx: number; numero: number }) => {
    if (!geo) return;
    if (!dentroDoMunicipio(geo, lon, lat)) { aviso('Esse ponto fica fora de Extremoz.'); return; }
    let end = resolverEndereco(geo, lon, lat);
    if (escolhido) {
      const rua = geo.ruas[escolhido.ruaIdx];
      const loc = geo.localidades[rua[1]];
      end = { via: rua[0], numero: String(escolhido.numero), localidade: loc.n, zona: loc.z, semEndereco: false, ruaIdx: escolhido.ruaIdx, sugestao: '' };
    }
    setRascunho({
      id: crypto.randomUUID(), lat, lon, via: end.via, numero: end.numero, semNumero: !end.numero, localidade: end.localidade, zona: end.zona, semEndereco: end.semEndereco, ruaIdx: end.ruaIdx,
      categoria: '', titulo: '', descricao: '', referencia: end.sugestao, fotos: [], pendente: false,
    });
    navegar('/');
    setGaveta('meio');
    api.current?.voar(lon, lat, Math.max(api.current.centro().zoom, 17));
  }, [geo, aviso, setRascunho]);

  const aoClicar = useCallback((lon: number, lat: number, zoom: number) => {
    if (rascunho) { moverRascunho(lon, lat); return; }
    if (zoom < ZOOM_MINIMO_APONTAR) {
      api.current?.voar(lon, lat, Math.min(16, zoom + 3));
      aviso('Aproximamos o mapa. Toque de novo no ponto exato do problema.');
      return;
    }
    iniciarEm(lon, lat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rascunho, iniciarEm, aviso]);

  function moverRascunho(lon: number, lat: number) {
    if (!geo) return;
    if (!dentroDoMunicipio(geo, lon, lat)) {
      aviso('Esse ponto fica fora de Extremoz.');
      // Devolve o alfinete para o último ponto válido.
      setRascunho((r) => (r ? { ...r } : r));
      return;
    }
    const end = resolverEndereco(geo, lon, lat);
    setRascunho((r) => (r ? {
      ...r, lat, lon, via: end.via, numero: end.numero, semNumero: !end.numero, localidade: end.localidade, zona: end.zona, semEndereco: end.semEndereco, ruaIdx: end.ruaIdx,
      referencia: r.referencia || end.sugestao,
    } : r));
  }

  const apontarAqui = () => {
    const c = api.current?.centro();
    if (!c) return;
    if (c.zoom < ZOOM_MINIMO_APONTAR) {
      api.current?.voar(c.lon, c.lat, 15.5);
      aviso('Aproxime o mapa até o local e toque em Apontar de novo, ou toque direto no ponto.');
      return;
    }
    iniciarEm(c.lon, c.lat);
  };

  const ondeEstou = () => {
    if (!navigator.geolocation) { aviso('Seu navegador não informa a localização.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { longitude: lon, latitude: lat } = p.coords;
        if (geo && !dentroDoMunicipio(geo, lon, lat)) { aviso('Você parece estar fora de Extremoz.'); return; }
        api.current?.minhaPosicao(lon, lat);
        api.current?.voar(lon, lat, 17);
      },
      () => aviso('Não foi possível ver sua localização. Libere o acesso no navegador.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  // ---------- filtros ----------
  const visiveis = useMemo(() => problemasVisiveis(problemas).filter((p) => !filtro.categoria || p.categoria === filtro.categoria), [problemas, filtro.categoria]);
  const nomeLocalidade = filtro.localidade >= 0 && geo ? geo.localidades[filtro.localidade].n : '';
  const naLista = useMemo(() => {
    const rua = filtro.ruaIdx >= 0 && geo ? geo.ruas[filtro.ruaIdx] : null;
    return visiveis
      .filter((p) => (!filtro.zona || p.zona === filtro.zona) && (!nomeLocalidade || p.localidade === nomeLocalidade) && (!rua || p.via === rua[0]))
      .filter((p) => !estaOculto(p, regras) || p.autor_id === sessao?.id || sessao?.isAdmin)
      .sort((a, b) => b.apoios - a.apoios || b.criado_em.localeCompare(a.criado_em));
  }, [visiveis, filtro, nomeLocalidade, geo, regras, sessao]);

  useEffect(() => {
    if (!geo) return;
    api.current?.destacarRua(filtro.ruaIdx >= 0 ? geo.ruas[filtro.ruaIdx] : null);
  }, [filtro.ruaIdx, geo]);

  const aplicarFiltro = useCallback((f: Partial<Filtro>, mover = true) => {
    setFiltro((a) => ({ ...a, ...f }));
    if (!geo || !mover) return;
    if (f.ruaIdx !== undefined && f.ruaIdx >= 0) {
      const rua = geo.ruas[f.ruaIdx];
      const pt = f.numero != null ? pontoDoNumero(rua, f.numero) : null;
      if (pt) api.current?.voar(pt.lon, pt.lat, 18);
      else api.current?.enquadrar(limitesDaRua(rua), 17);
      setGaveta('meio');
    } else if (f.localidade !== undefined && f.localidade >= 0) {
      api.current?.enquadrar(limitesDaLocalidade(geo, f.localidade), 16);
    } else if (f.zona) {
      const idx = geo.localidades.map((l, i) => (l.z === f.zona ? i : -1)).filter((i) => i >= 0);
      const lim = idx.map((i) => limitesDaLocalidade(geo, i));
      if (lim.length) api.current?.enquadrar([[Math.min(...lim.map((b) => b[0][0])), Math.min(...lim.map((b) => b[0][1]))], [Math.max(...lim.map((b) => b[1][0])), Math.max(...lim.map((b) => b[1][1]))]], 15);
    } else if (f.zona === '' && f.localidade === -1 && f.ruaIdx === -1) api.current?.visaoGeral();
  }, [geo]);

  // ---------- problema aberto pela URL ----------
  const selecionado = problemaId ? problemas.find((p) => p.id === problemaId) || null : null;
  const voouPara = useRef<string | null>(null);
  useEffect(() => {
    if (!problemaId) { voouPara.current = null; return; }
    if (selecionado && voouPara.current !== problemaId) {
      voouPara.current = problemaId;
      setGaveta('meio');
      setTimeout(() => api.current?.voar(selecionado.lon, selecionado.lat, Math.max(api.current.centro().zoom, 16.5)), 250);
    }
  }, [problemaId, selecionado]);

  const abrir = useCallback((id: string) => { if (!rascunho) navegar(`/problema/${id}`); }, [rascunho]);

  // ---------- gaveta do celular ----------
  const arraste = useRef<{ y0: number; h0: number; t0: number; moveu: boolean } | null>(null);
  const baixoInicio = (e: RPointer<HTMLDivElement>) => {
    arraste.current = { y0: e.clientY, h0: alturaGaveta, t0: performance.now(), moveu: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const baixoMove = (e: RPointer<HTMLDivElement>) => {
    const a = arraste.current;
    if (!a) return;
    const dy = e.clientY - a.y0;
    if (Math.abs(dy) > 4) a.moveu = true;
    if (a.moveu) setArrasteH(Math.max(alturas.baixo * 0.7, Math.min(alturas.alto, a.h0 - dy)));
  };
  const baixoFim = (e: RPointer<HTMLDivElement>) => {
    const a = arraste.current;
    arraste.current = null;
    if (!a) return;
    const ordem: NivelGaveta[] = ['baixo', 'meio', 'alto'];
    if (!a.moveu) {
      setGaveta(gaveta === 'baixo' ? 'meio' : gaveta === 'meio' ? 'alto' : 'meio');
      return;
    }
    const h = a.h0 - (e.clientY - a.y0);
    const vel = (e.clientY - a.y0) / Math.max(1, performance.now() - a.t0);
    let alvo = ordem.reduce((m, k) => (Math.abs(alturas[k] - h) < Math.abs(alturas[m] - h) ? k : m), 'baixo' as NivelGaveta);
    if (Math.abs(vel) > 0.5) {
      const i = ordem.indexOf(gaveta) + (vel < 0 ? 1 : -1);
      alvo = ordem[Math.max(0, Math.min(2, i))];
    }
    setGaveta(alvo);
    setArrasteH(null);
  };

  const terminarNovo = useCallback((id?: string) => {
    setRascunho(null);
    if (id) navegar(`/problema/${id}`);
  }, [setRascunho]);

  const conteudo = rascunho ? (
    <NovoProblemaForm
      rascunho={rascunho}
      setRascunho={setRascunho}
      aoTerminar={terminarNovo}
      aoMoverPara={(lon, lat) => { api.current?.voar(lon, lat, 18); }}
      aoAbrirExistente={(id) => { setRascunho(null); navegar(`/problema/${id}`); }}
    />
  ) : problemaId ? (
    <Detalhe id={problemaId} problema={selecionado} aoVoltar={() => navegar('/')} />
  ) : (
    <Inicio filtro={filtro} aplicar={aplicarFiltro} lista={naLista} aoFocarBusca={() => setGaveta('alto')} aoApontarNumero={iniciarEm} aoVoar={(lon, lat, z) => { api.current?.voar(lon, lat, z); setGaveta('baixo'); }} />
  );

  return (
    <main ref={caixa} className="area-mapa" hidden={!ativo}>
      <aside
        className={`painel${arrasteH != null ? ' arrastando' : ''}`}
        style={celular ? { height: alturaGaveta } : undefined}
        aria-label="Painel de problemas"
      >
        <div
          className="alca"
          role="button"
          tabIndex={0}
          aria-label="Expandir ou recolher o painel"
          onPointerDown={baixoInicio}
          onPointerMove={baixoMove}
          onPointerUp={baixoFim}
          onPointerCancel={() => { arraste.current = null; setArrasteH(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGaveta(gaveta === 'baixo' ? 'meio' : gaveta === 'meio' ? 'alto' : 'baixo'); } }}
        ><i /></div>
        <div className="painel-rolagem">{conteudo}</div>
      </aside>
      <section className="area-canvas">
        {erroGeo && <div className="aviso-topo">Não foi possível carregar os endereços. Recarregue a página.</div>}
        <MapView
          apiRef={api}
          geo={geo}
          problemas={visiveis}
          selecionado={problemaId}
          rascunho={rascunho ? { lat: rascunho.lat, lon: rascunho.lon } : null}
          margemInferior={celular ? Math.min(alturas.meio, alturaGaveta) : 0}
          aoClicar={aoClicar}
          aoAbrir={abrir}
          aoArrastar={moverRascunho}
        />
        {rascunho && <div className="dica-mapa">Arraste o alfinete até o ponto exato</div>}
        {!rascunho && (
          <div className="fabs" style={celular ? { bottom: Math.min(alturas.meio, alturaGaveta) + 12 } : undefined}>
            <button type="button" className="fab-local" onClick={ondeEstou} aria-label="Mostrar onde estou">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5" fill="currentColor" /><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
            <button type="button" className="fab-apontar" onClick={apontarAqui}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              Apontar problema
            </button>
          </div>
        )}
        <div className="legenda" aria-label="Legenda: cor do ponto conforme o número de apoios" style={celular ? { display: 'none' } : undefined}>
          <span className="rotulo">Apoios</span>
          <div className="legenda-barra">{CORES_APOIO.map((c) => <span key={c} style={{ background: c }} />)}</div>
          <div className="legenda-num">{FAIXAS_APOIO.map((f, i) => <span key={f}>{f}{i === FAIXAS_APOIO.length - 1 ? '+' : ''}</span>)}</div>
        </div>
      </section>
    </main>
  );
}
