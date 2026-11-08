import { useMemo, useState } from 'react';
import { CATEGORIAS, CORES_APOIO, faixaDeApoio, NOME_CATEGORIA, ZONAS } from '../dados/constantes';
import { estaOculto, problemasVisiveis, useApp } from '../estado/App';
import { navegar } from '../lib/rota';
import { enderecoCurto, tempoAberto } from '../lib/texto';
import { EspacoPatrocinio } from '../ui/Comum';

export default function Prioridades() {
  const { geo, problemas, regras, carregouProblemas } = useApp();
  const [zona, setZona] = useState('');
  const [local, setLocal] = useState('');
  const [cat, setCat] = useState('');

  const lista = useMemo(() => problemasVisiveis(problemas)
    .filter((p) => p.status !== 'resolvido' && !estaOculto(p, regras))
    .filter((p) => (!zona || p.zona === zona) && (!local || p.localidade === local) && (!cat || p.categoria === cat))
    .sort((a, b) => b.apoios - a.apoios || a.criado_em.localeCompare(b.criado_em)), [problemas, regras, zona, local, cat]);

  const resolvidos = problemas.filter((p) => p.status === 'resolvido').length;
  const abertos = problemas.filter((p) => p.status === 'aberto' || p.status === 'andamento').length;
  const locais = (geo?.localidades || []).filter((l) => !zona || l.z === zona);
  const filtrando = zona || local || cat;

  return (
    <section className="pagina"><div className="largura">
      <header className="cabeca">
        <div>
          <p className="rotulo">Prioridades</p>
          <h1>O que Extremoz mais quer ver resolvido</h1>
          <p className="suave">Ordenado pelos apoios dos moradores. {abertos} em aberto, {resolvidos} resolvido{resolvidos === 1 ? '' : 's'}.</p>
        </div>
        <div className="filtros-pagina">
          <select aria-label="Zona" value={zona} onChange={(e) => { setZona(e.target.value); setLocal(''); }}>
            <option value="">Toda a cidade</option>
            {ZONAS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select aria-label="Bairro ou localidade" value={local} onChange={(e) => setLocal(e.target.value)}>
            <option value="">Todos os bairros</option>
            {locais.map((l) => <option key={l.n}>{l.n}</option>)}
          </select>
          <select aria-label="Tipo de problema" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todos os tipos</option>
            {CATEGORIAS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </header>
      {lista.length ? (
        <ol className="ranking">
          {lista.slice(0, 200).map((p, i) => (
            <li key={p.id}>
              <button type="button" onClick={() => navegar(`/problema/${p.id}`)}>
                <span className="pos">{i + 1}</span>
                <span className="rk-texto">
                  <b>{p.titulo}</b> <span className="etiqueta">{NOME_CATEGORIA[p.categoria]}</span>
                  <small>{enderecoCurto(p)} · {p.localidade}</small>
                  <small>{tempoAberto(p)} · {p.comentarios} coment.{p.protocolo ? ` · protocolo ${p.protocolo}` : ''}</small>
                </span>
                <span className="rk-apoios"><i style={{ background: p.status === 'andamento' ? 'var(--lagoa)' : CORES_APOIO[faixaDeApoio(p.apoios)] }} />{p.apoios}<small>apoio{p.apoios === 1 ? '' : 's'}</small></span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="vazio grande">
          <b>{carregouProblemas !== true ? 'Carregando…' : filtrando ? 'Nenhum problema com esse filtro' : 'A lista começa com a primeira publicação'}</b>
          {carregouProblemas === true && <button type="button" className="link" onClick={() => navegar('/')}>Apontar um problema no mapa →</button>}
        </div>
      )}
      {lista.length > 200 && <p className="suave centro">Mostrando os 200 mais apoiados.</p>}
      <EspacoPatrocinio espaco="prioridades" />
    </div></section>
  );
}
