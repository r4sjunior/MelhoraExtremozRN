import { useCallback, useEffect, useState } from 'react';
import { backend } from '../backend';
import { CORES_APOIO, faixaDeApoio, MOTIVO_GRAVE, MOTIVOS_DENUNCIA, NOME_CATEGORIA, STATUS_NOME } from '../dados/constantes';
import { estaOculto, useApp } from '../estado/App';
import { navegar } from '../lib/rota';
import { copiar, dataCurta, dataHora, enderecoCurto, linkProblema, tempoAberto } from '../lib/texto';
import type { Comentario, EventoHistorico, Problema, Status } from '../types';
import { Modal } from '../ui/Comum';

export function Detalhe({ id, problema: p, aoVoltar }: { id: string; problema: Problema | null; aoVoltar(): void }) {
  const { sessao, podeParticipar, meusApoios, minhasDenuncias, regras, apoiar, denunciar, aviso, avisoErro, exigeLogin, recarregar, carregouProblemas } = useApp();
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [historico, setHistorico] = useState<EventoHistorico[]>([]);
  const [texto, setTexto] = useState('');
  const [denunciando, setDenunciando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState('');
  const [enviandoCom, setEnviandoCom] = useState(false);

  const nComentarios = p?.comentarios;
  const atualizado = p?.atualizado_em;
  const carregar = useCallback(() => {
    backend.comentarios(id).then(setComentarios).catch((e) => console.error(e));
    backend.historico(id).then(setHistorico).catch((e) => console.error(e));
  }, [id]);
  useEffect(() => { carregar(); }, [carregar, nComentarios, atualizado, p?.status, p?.protocolo]);
  useEffect(() => { setProtocolo(p?.protocolo || ''); }, [p?.protocolo]);
  useEffect(() => { setDenunciando(false); setExcluindo(false); setTexto(''); }, [id]);

  if (!p) {
    return (
      <>
        <button type="button" className="btn peq claro alinha-ini" onClick={aoVoltar}>← Voltar</button>
        <div className="vazio">{carregouProblemas === true ? 'Esse problema não está mais disponível.' : 'Carregando…'}</div>
      </>
    );
  }

  const meu = p.autor_id === sessao?.id;
  const apoiei = meusApoios.has(p.id);
  const denunciei = minhasDenuncias.has(p.id);
  const cor = CORES_APOIO[faixaDeApoio(p.apoios)];
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${p.titulo}, ${enderecoCurto(p)}, ${p.localidade}. Já tem ${p.apoios} apoio${p.apoios > 1 ? 's' : ''} no Melhora Extremoz. Viu também? Apoie: ${linkProblema(p.id)}`)}`;

  async function comentar() {
    const t = texto.trim();
    if (t.length < 3) { aviso('Escreva o comentário.'); return; }
    if (!exigeLogin()) return;
    setEnviandoCom(true);
    try {
      await backend.comentar(p!.id, t);
      setTexto('');
      await recarregar();
      carregar();
      aviso('Comentário publicado.');
    } catch (e) { avisoErro(e, 'Não foi possível comentar.'); } finally { setEnviandoCom(false); }
  }

  async function excluirProblema() {
    try {
      await backend.excluirProblema(p!);
      await recarregar();
      aviso('Publicação excluída.');
      aoVoltar();
    } catch (e) { avisoErro(e, 'Não foi possível excluir.'); }
  }

  async function salvarProtocolo() {
    try {
      await backend.definirProtocolo(p!.id, protocolo);
      await recarregar();
      carregar();
      aviso('Protocolo salvo.');
    } catch (e) { avisoErro(e, 'Não foi possível salvar o protocolo.'); }
  }

  return (
    <>
      <div className="linha entre">
        <button type="button" className="btn peq claro" onClick={aoVoltar}>← Voltar</button>
        <span className="etiqueta">{NOME_CATEGORIA[p.categoria] || 'Problema'}</span>
      </div>
      <div>
        <h2>{p.titulo}</h2>
        <div className="endereco"><b>{enderecoCurto(p)}</b> · {p.localidade}{p.referencia ? ` · ${p.referencia}` : ''}</div>
        <div className="endereco">Por {meu ? 'você' : p.autor_nome} em {dataHora(p.criado_em)}</div>
      </div>
      <div className="linha">
        <span className={`status st-${p.status}`}>{STATUS_NOME[p.status]}</span>
        {p.status !== 'resolvido' && <span className="suave">{tempoAberto(p)}</span>}
      </div>
      {estaOculto(p, regras) && <div className="destaque alerta">Oculta do mapa por denúncias. Só a moderação e quem publicou conseguem ver.</div>}

      <div className="apoio">
        <span className="apoio-n" style={{ background: p.status === 'resolvido' ? 'var(--ok)' : cor }}>{p.apoios}</span>
        <span className="apoio-txt">{meu ? 'Você publicou; seu apoio já conta.' : apoiei ? 'Você apoia este problema.' : 'Também viu isso? Apoie para dar mais peso.'}</span>
        {meu ? <button type="button" className="btn apoiado" disabled>✓ Apoiado</button> : (
          <button type="button" className={`btn${apoiei ? ' apoiado' : ''}`} disabled={!!sessao?.suspenso} onClick={() => apoiar(p.id)}>{apoiei ? '✓ Apoiado' : '▲ Apoiar'}</button>
        )}
      </div>

      <p className="descricao">{p.descricao}</p>
      {p.fotos.length > 0 && (
        <div className="galeria" style={{ gridTemplateColumns: `repeat(${Math.min(3, p.fotos.length)}, 1fr)` }}>
          {p.fotos.map((f) => <button type="button" key={f} onClick={() => setAmpliada(f)} aria-label="Ampliar foto"><img src={backend.urlFoto(f)} alt="Foto do problema" loading="lazy" /></button>)}
        </div>
      )}
      {ampliada && <Modal aoFechar={() => setAmpliada(null)}><img className="foto-ampliada" src={backend.urlFoto(ampliada)} alt="Foto ampliada" /><button type="button" className="btn claro" onClick={() => setAmpliada(null)}>Fechar</button></Modal>}

      <div className="acoes">
        <button type="button" className="btn verde-claro" onClick={() => navegar(`/cobrar?p=${p.id}`)}>Cobrar quem resolve</button>
        <a className="btn claro" href={whatsapp} target="_blank" rel="noopener noreferrer">Chamar vizinhos no WhatsApp</a>
        <button type="button" className="btn claro" onClick={async () => aviso((await copiar(linkProblema(p.id))) ? 'Link copiado.' : 'Não foi possível copiar.')}>Copiar link</button>
      </div>

      <div>
        <p className="rotulo">Acompanhamento</p>
        <ol className="linha-tempo">
          {historico.map((h) => (
            <li key={h.id}>
              <b>{STATUS_NOME[h.status as Status] || h.status}</b>{h.protocolo ? ` · protocolo ${h.protocolo}` : ''}
              <small>{dataCurta(h.em)}</small>
              {h.nota && <span>{h.nota}</span>}
            </li>
          ))}
        </ol>
        {(meu || sessao?.isAdmin) && p.status !== 'removido' && (
          <div className="protocolo">
            <label className="rotulo" htmlFor="dProt">Número do protocolo na Prefeitura</label>
            <div className="linha">
              <input id="dProt" type="text" maxLength={40} value={protocolo} placeholder="Ex.: 2026-000123" onChange={(e) => setProtocolo(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              <button type="button" className="btn claro" onClick={salvarProtocolo} disabled={protocolo === (p.protocolo || '')}>Salvar</button>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="rotulo">Comentários · {comentarios.length}</p>
        <div className="lista">
          {comentarios.length ? comentarios.map((c) => (
            <div className="comentario" key={c.id}>
              <div className="comentario-quem">{c.autor_id === sessao?.id ? 'Você' : c.autor_nome} · {dataCurta(c.em)}
                {(c.autor_id === sessao?.id || sessao?.isAdmin) && (
                  <button type="button" className="link" onClick={async () => { try { await backend.excluirComentario(c.id); await recarregar(); carregar(); } catch (e) { avisoErro(e, 'Não foi possível excluir.'); } }}>excluir</button>
                )}
              </div>
              {c.texto}
            </div>
          )) : <p className="suave">Ninguém comentou ainda. Sabe desde quando está assim? Conte aqui.</p>}
        </div>
        <textarea aria-label="Escreva um comentário" maxLength={600} value={texto} placeholder="Desde quando? Piorou? Já protocolou na Prefeitura?" onChange={(e) => setTexto(e.target.value)} style={{ marginTop: 8, minHeight: 70 }} />
        <button type="button" className="btn claro cheio" disabled={enviandoCom || !!sessao?.suspenso} onClick={comentar}>Comentar</button>
      </div>

      {!meu && (denunciei ? <p className="suave">Você denunciou esta publicação. Obrigado por ajudar a manter o mapa confiável.</p> : denunciando ? (
        <div className="destaque alerta">
          <b>Por que denunciar?</b>
          <div className="chips" style={{ marginTop: 8 }}>
            {MOTIVOS_DENUNCIA.map((m) => (
              <button type="button" key={m} onClick={async () => {
                try {
                  await denunciar(p.id, m);
                  setDenunciando(false);
                  aviso(m === MOTIVO_GRAVE ? 'Denúncia registrada. A publicação saiu do mapa até a revisão.' : 'Denúncia registrada.');
                } catch (e) { avisoErro(e, 'Não foi possível denunciar.'); }
              }}>{m}</button>
            ))}
          </div>
          <button type="button" className="btn peq claro" style={{ marginTop: 8 }} onClick={() => setDenunciando(false)}>Cancelar</button>
        </div>
      ) : <button type="button" className="btn peq claro alinha-ini" disabled={!!sessao?.suspenso} onClick={() => { if (podeParticipar || exigeLogin()) setDenunciando(true); }}>⚑ Denunciar publicação</button>)}

      {meu && (excluindo ? (
        <div className="destaque alerta">
          Excluir esta publicação? Isso não pode ser desfeito.
          <div className="linha" style={{ marginTop: 8 }}>
            <button type="button" className="btn peq perigo" onClick={excluirProblema}>Excluir</button>
            <button type="button" className="btn peq claro" onClick={() => setExcluindo(false)}>Cancelar</button>
          </div>
        </div>
      ) : <button type="button" className="link perigo-txt alinha-ini" onClick={() => setExcluindo(true)}>Excluir publicação</button>)}
    </>
  );
}
