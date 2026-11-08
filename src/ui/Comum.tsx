import { useEffect, useState, type ReactNode } from 'react';
import { backend } from '../backend';
import { CORES_APOIO, faixaDeApoio, STATUS_NOME } from '../dados/constantes';
import { estaOculto, useApp } from '../estado/App';
import { navegar } from '../lib/rota';
import { dataCurta, enderecoCurto } from '../lib/texto';
import type { EspacoId, Problema } from '../types';

export function Logo({ tamanho = 40 }: { tamanho?: number }) {
  return (
    <svg className="logo" width={tamanho} height={tamanho} viewBox="0 0 64 64" role="img" aria-label="Marcador sobre a lagoa e as dunas de Extremoz">
      <defs><clipPath id="lg"><circle cx="32" cy="32" r="30" /></clipPath></defs>
      <circle cx="32" cy="32" r="30" fill="#0e6b5a" />
      <g clipPath="url(#lg)">
        <path d="M0 44 Q14 34 28 40 T64 37 V64 H0Z" fill="#f4b41a" />
        <path d="M0 50 Q10 46 20 50 T40 50 T64 49 V64 H0Z" fill="#1786c5" />
        <path d="M0 56 Q10 52 20 56 T40 56 T64 55 V64 H0Z" fill="#fff" opacity=".35" />
      </g>
      <path d="M32 45 C27 37 19.5 31.5 19.5 22.5 A12.5 12.5 0 0 1 44.5 22.5 C44.5 31.5 37 37 32 45Z" fill="#fff" />
      <circle cx="32" cy="22.5" r="5" fill="#0e6b5a" />
    </svg>
  );
}

export function Modal({ children, aoFechar, rotulo }: { children: ReactNode; aoFechar?: () => void; rotulo?: string }) {
  useEffect(() => {
    if (!aoFechar) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [aoFechar]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={rotulo} onClick={(e) => { if (e.target === e.currentTarget) aoFechar?.(); }}>
      <div className="cartao">{children}</div>
    </div>
  );
}

export function ItemProblema({ p, aoAbrir }: { p: Problema; aoAbrir?: () => void }) {
  const { regras } = useApp();
  return (
    <button type="button" className="item" onClick={aoAbrir || (() => navegar(`/problema/${p.id}`))}>
      <span className="bola" style={{ background: p.status === 'resolvido' ? 'var(--ok)' : p.status === 'andamento' ? 'var(--lagoa)' : CORES_APOIO[faixaDeApoio(p.apoios)] }}>{p.apoios}</span>
      <span className="item-texto">
        <span className="item-titulo">{p.titulo}</span>
        <small>{enderecoCurto(p)} · {p.localidade}</small>
        <small>{dataCurta(p.criado_em)} · {p.comentarios} coment.</small>
      </span>
      {estaOculto(p, regras) ? <span className="status st-removido">Oculto</span> : p.status !== 'aberto' && <span className={`status st-${p.status}`}>{STATUS_NOME[p.status]}</span>}
    </button>
  );
}

export function AvisoEntrar() {
  const { sessao, carregouSessao, abrirModal } = useApp();
  if (!carregouSessao) return null;
  if (sessao?.suspenso) return <div className="destaque alerta">Sua conta foi suspensa pela moderação. Você ainda vê o mapa, mas não pode publicar, apoiar nem comentar.</div>;
  if (sessao) return null;
  return (
    <div className="destaque com-botao">
      <span>Entre para publicar, apoiar e comentar. Sem conta, você vê tudo.</span>
      <button type="button" className="btn peq" onClick={() => abrirModal('login')}>Entrar</button>
    </div>
  );
}

/** Espaço de patrocínio: não renderiza nada se não houver banner ativo; alterna entre os ativos. */
export function EspacoPatrocinio({ espaco }: { espaco: EspacoId }) {
  const { patrocinios, abrirModal } = useApp();
  const lista = patrocinios.filter((p) => p.ativo && p.espacos.includes(espaco));
  const [i, setI] = useState(0);
  const atual = lista[i % Math.max(1, lista.length)];
  const segundos = atual?.segundos || 10;
  useEffect(() => {
    if (lista.length < 2) return;
    const t = setTimeout(() => setI((x) => x + 1), segundos * 1000);
    return () => clearTimeout(t);
  }, [i, lista.length, segundos]);
  if (!atual) return null;
  const conteudo = atual.imagem ? (
    <img src={backend.urlFoto(atual.imagem)} alt={atual.titulo || atual.patrocinador} />
  ) : (
    <>
      <span className="pat-tag">Apoio</span>
      <span className="pat-texto"><b>{atual.titulo}</b>{atual.texto && <small>{atual.texto}</small>}</span>
      <span className="pat-botao">{atual.botao}</span>
    </>
  );
  const classe = `patrocinio esp-${espaco}${atual.imagem ? ' com-imagem' : ''}`;
  return atual.url
    ? <a className={classe} href={atual.url} target="_blank" rel="noopener sponsored">{conteudo}</a>
    : <button type="button" className={classe} onClick={() => abrirModal({ contato: 'Apoio institucional' })}>{conteudo}</button>;
}
