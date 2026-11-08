import { useMemo, useState } from 'react';
import { CATEGORIAS, ZONAS } from '../dados/constantes';
import { useApp } from '../estado/App';
import { buscar, pontoDoNumero, type Sugestao } from '../lib/geo';
import { navegar } from '../lib/rota';
import type { Problema, ZonaId } from '../types';
import { AvisoEntrar, EspacoPatrocinio, ItemProblema } from '../ui/Comum';

export interface Filtro {
  zona: ZonaId | '';
  localidade: number;
  categoria: string;
  ruaIdx: number;
  numero: number | null;
}

interface Props {
  filtro: Filtro;
  aplicar(f: Partial<Filtro>, mover?: boolean): void;
  lista: Problema[];
  aoFocarBusca(): void;
  aoApontarNumero(lon: number, lat: number, escolhido: { ruaIdx: number; numero: number }): void;
  aoVoar(lon: number, lat: number, zoom: number): void;
}

export function Inicio({ filtro, aplicar, lista, aoFocarBusca, aoApontarNumero, aoVoar }: Props) {
  const { geo, carregouProblemas } = useApp();
  const [texto, setTexto] = useState('');
  const [foco, setFoco] = useState(false);
  const [marcada, setMarcada] = useState(-1);
  const sugestoes = useMemo(() => (geo ? buscar(geo, texto) : []), [geo, texto]);

  const localidades = useMemo(() => (geo ? geo.localidades.map((l, i) => ({ ...l, i })).filter((l) => !filtro.zona || l.z === filtro.zona) : []), [geo, filtro.zona]);
  const rua = filtro.ruaIdx >= 0 && geo ? geo.ruas[filtro.ruaIdx] : null;
  const onde = rua ? rua[0] : filtro.localidade >= 0 && geo ? geo.localidades[filtro.localidade].n : filtro.zona ? ZONAS.find((z) => z[0] === filtro.zona)![1] : 'Extremoz';
  const pt = rua && filtro.numero != null ? pontoDoNumero(rua, filtro.numero) : null;

  function escolher(s: Sugestao) {
    if (!geo) return;
    setFoco(false);
    setMarcada(-1);
    if (s.tipo === 'rua') {
      setTexto(geo.ruas[s.ruaIdx][0] + (s.numero != null ? `, ${s.numero}` : ''));
      const loc = geo.ruas[s.ruaIdx][1];
      aplicar({ ruaIdx: s.ruaIdx, numero: s.numero, localidade: loc, zona: geo.localidades[loc].z });
    } else if (s.tipo === 'localidade') {
      setTexto(geo.localidades[s.idx].n);
      aplicar({ localidade: s.idx, zona: geo.localidades[s.idx].z, ruaIdx: -1, numero: null });
    } else {
      // Referência de bairro: leva até o ponto, sem filtrar a lista.
      const r = geo.referencias[s.idx];
      setTexto(r.n);
      aoVoar(r.lo, r.la, 15.5);
    }
  }

  const limpar = () => { setTexto(''); aplicar({ zona: '', localidade: -1, ruaIdx: -1, numero: null }); };

  return (
    <>
      <div className="busca">
        <label className="rotulo" htmlFor="qBusca">Onde é o problema?</label>
        <div className="busca-caixa">
          <input
            id="qBusca"
            type="search"
            autoComplete="off"
            placeholder="Rua, número ou bairro (ex.: Felipe Camarão, 139)"
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setFoco(true); setMarcada(-1); }}
            onFocus={() => { setFoco(true); aoFocarBusca(); }}
            onBlur={() => setTimeout(() => setFoco(false), 150)}
            onKeyDown={(e) => {
              if (!sugestoes.length) return;
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setMarcada((m) => (m + (e.key === 'ArrowDown' ? 1 : -1) + sugestoes.length) % sugestoes.length);
              }
              if (e.key === 'Enter') { e.preventDefault(); escolher(sugestoes[Math.max(0, marcada)]); }
            }}
          />
          {foco && texto.trim().length >= 2 && geo && (
            <div className="sugestoes" role="listbox">
              {sugestoes.length ? sugestoes.map((s, i) => {
                let titulo = '', sub = '';
                if (s.tipo === 'rua') {
                  const r = geo.ruas[s.ruaIdx];
                  titulo = r[0] + (s.numero != null ? `, ${s.numero}` : '');
                  const trecho = r[3] ? `nº ${r[2]} a ${r[3]}` : 'sem numeração';
                  sub = `${geo.localidades[r[1]].n} · ${s.numero != null && s.cabe ? 'número dentro do trecho' : trecho}`;
                } else if (s.tipo === 'localidade') {
                  titulo = geo.localidades[s.idx].n;
                  sub = 'Bairro ou localidade';
                } else {
                  titulo = geo.referencias[s.idx].n;
                  sub = 'Referência no mapa';
                }
                return (
                  <button type="button" key={`${s.tipo}${i}`} role="option" aria-selected={i === marcada} className={i === marcada ? 'marcada' : ''} onMouseDown={(e) => { e.preventDefault(); escolher(s); }}>
                    <b>{titulo}</b><small>{sub}</small>
                  </button>
                );
              }) : <p className="vazio-sug">Nada encontrado. Muitas vias de Extremoz estão sem nome no cadastro: tente o bairro ou toque direto no mapa.</p>}
            </div>
          )}
        </div>
        <div className="filtros">
          <select aria-label="Zona" value={filtro.zona} onChange={(e) => { const z = e.target.value as ZonaId | ''; setTexto(''); aplicar({ zona: z, localidade: -1, ruaIdx: -1, numero: null }); }}>
            <option value="">Toda a cidade</option>
            {ZONAS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select aria-label="Bairro ou localidade" value={filtro.localidade} onChange={(e) => { const i = +e.target.value; setTexto(''); if (i >= 0 && geo) aplicar({ localidade: i, zona: geo.localidades[i].z, ruaIdx: -1, numero: null }); else aplicar({ localidade: -1, ruaIdx: -1, numero: null, zona: filtro.zona }); }}>
            <option value={-1}>Todos os bairros</option>
            {localidades.map((l) => <option key={l.i} value={l.i}>{l.n}</option>)}
          </select>
          <select aria-label="Tipo de problema" className="largo" value={filtro.categoria} onChange={(e) => aplicar({ categoria: e.target.value }, false)}>
            <option value="">Todos os tipos</option>
            {CATEGORIAS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {(filtro.zona || filtro.localidade >= 0 || filtro.ruaIdx >= 0) && <button type="button" className="link" onClick={limpar}>Limpar filtros</button>}
      </div>

      <AvisoEntrar />

      {rua && filtro.numero != null && pt ? (
        <div className="destaque">
          <b>Antes de publicar:</b> veja abaixo se já apontaram o problema em {rua[0]}. Se sim, é só apoiar.
          <button type="button" className="btn" onClick={() => aoApontarNumero(pt.lon, pt.lat, { ruaIdx: filtro.ruaIdx, numero: filtro.numero! })}>+ Apontar problema no nº {filtro.numero}</button>
          {pt.fora && <small>Esse número está fora do trecho cadastrado. Ajuste o alfinete no mapa.</small>}
        </div>
      ) : rua ? (
        <div className="destaque"><b>Antes de publicar:</b> veja abaixo se já apontaram o problema nesta via. Para um problema novo, toque no ponto do mapa.</div>
      ) : (
        <div className="destaque">Para apontar um problema, <b>toque no ponto exato do mapa</b> ou busque o endereço.</div>
      )}

      <div>
        <p className="rotulo">{rua ? 'Já apontados nesta via' : `Mais apoiados em ${onde}`} · {lista.length}</p>
        <div className="lista">
          {lista.length ? lista.slice(0, 60).map((p) => <ItemProblema key={p.id} p={p} />) : (
            <div className="vazio">
              {carregouProblemas === 'erro' ? 'Não conseguimos carregar os problemas agora. Recarregue a página.' : carregouProblemas ? 'Nenhum problema publicado aqui ainda. Seja a primeira pessoa a apontar.' : 'Carregando problemas…'}
            </div>
          )}
        </div>
      </div>
      {lista.length > 0 && !rua && <button type="button" className="link" onClick={() => navegar('/prioridades')}>Ver as prioridades da cidade →</button>}
      <EspacoPatrocinio espaco="mapa" />
    </>
  );
}
