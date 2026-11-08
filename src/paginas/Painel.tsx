import { useCallback, useEffect, useMemo, useState } from 'react';
import { backend } from '../backend';
import { CATEGORIAS, ESPACOS, NOME_CATEGORIA, NOME_ZONA, STATUS_NOME, ZONAS } from '../dados/constantes';
import { estaOculto, useApp } from '../estado/App';
import { normalizar } from '../lib/texto';
import { navegar } from '../lib/rota';
import { baixarArquivo, copiar, dataCurta, dataHora, enderecoCurto, problemasParaCsv } from '../lib/texto';
import type { CadastroMfa, DenunciaAdmin, EspacoId, EstadoMfa, Mensagem, PainelAcessos, Patrocinio, Problema, Regras, Status, UsuarioAdmin } from '../types';
import { Modal } from '../ui/Comum';

type Aba = 'geral' | 'acessos' | 'denuncias' | 'problemas' | 'mensagens' | 'usuarios' | 'patrocinio' | 'regras';

function Barras({ linhas }: { linhas: [string, number][] }) {
  const max = Math.max(1, ...linhas.map((l) => l[1]));
  if (!linhas.length) return <p className="suave">Sem dados ainda.</p>;
  return (
    <div className="barras">
      {linhas.map(([k, v]) => (
        <div className="barra" key={k}>
          <span className="barra-nome">{k}</span>
          <span className="barra-trilho"><i style={{ width: `${v ? Math.max(3, (v / max) * 100) : 0}%` }} /></span>
          <span className="barra-valor">{v}</span>
        </div>
      ))}
    </div>
  );
}

const Cab = ({ t, s }: { t: string; s?: string }) => <header className="adm-cab"><h1>{t}</h1>{s && <p className="suave">{s}</p>}</header>;

function Geral({ irPara, denuncias, mensagens }: { irPara(a: Aba): void; denuncias: number; mensagens: number }) {
  const { problemas } = useApp();
  const c: Record<Status, number> = { aberto: 0, andamento: 0, resolvido: 0, removido: 0 };
  problemas.forEach((p) => { c[p.status]++; });
  const ativos = problemas.filter((p) => p.status !== 'removido');
  const apoios = ativos.reduce((s, p) => s + p.apoios, 0);
  const coms = ativos.reduce((s, p) => s + p.comentarios, 0);
  const porZona = ZONAS.map(([k, v]): [string, number] => [v, ativos.filter((p) => p.zona === k).length]).sort((a, b) => b[1] - a[1]);
  const porCat = CATEGORIAS.map(([k, v]): [string, number] => [v, ativos.filter((p) => p.categoria === k).length]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
  const topo = ativos.filter((p) => p.status !== 'resolvido').sort((a, b) => b.apoios - a.apoios).slice(0, 5);
  const kpi = (n: number, l: string, cl = '') => <div className={`kpi ${cl}`}><b>{n}</b><span>{l}</span></div>;
  return (
    <>
      <Cab t="Visão geral" s="Como está o Melhora Extremoz agora." />
      {(denuncias > 0 || mensagens > 0) && (
        <div className="adm-alertas">
          {denuncias > 0 && <button type="button" onClick={() => irPara('denuncias')}><b>{denuncias}</b> publicação(ões) denunciada(s) aguardam revisão →</button>}
          {mensagens > 0 && <button type="button" onClick={() => irPara('mensagens')}><b>{mensagens}</b> mensagem(ns) nova(s) →</button>}
        </div>
      )}
      <div className="kpis">{kpi(c.aberto, 'Abertos')}{kpi(c.andamento, 'Em andamento', 'azul')}{kpi(c.resolvido, 'Resolvidos', 'verde')}{kpi(c.removido, 'Removidos', 'cinza')}{kpi(apoios, 'Apoios')}{kpi(coms, 'Comentários')}</div>
      <div className="duas">
        <section className="adm-cartao"><h3>Problemas por zona</h3><Barras linhas={porZona} /></section>
        <section className="adm-cartao"><h3>Por tipo</h3><Barras linhas={porCat} /></section>
      </div>
      <section className="adm-cartao">
        <h3>Mais apoiados em aberto</h3>
        {topo.length ? <ol className="adm-lista">{topo.map((p) => <li key={p.id}><button type="button" className="link" onClick={() => navegar(`/problema/${p.id}`)}>{p.titulo}</button> <span className="suave">{enderecoCurto(p)} · {p.apoios} apoios</span></li>)}</ol> : <p className="suave">Nenhum problema em aberto.</p>}
      </section>
    </>
  );
}

function Acessos() {
  const [dias, setDias] = useState(30);
  const [a, setA] = useState<PainelAcessos | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => { setErro(false); backend.admin.acessos(dias).then(setA).catch(() => setErro(true)); }, [dias]);
  const nomes: Record<string, string> = { mapa: 'Mapa', prioridades: 'Prioridades', cobrar: 'Cobrar', sobre: 'Sobre', termos: 'Termos', privacidade: 'Privacidade' };
  return (
    <>
      <Cab t="Acessos" s="Contagem própria e anônima. Divulgue links com ?origem=nome (ex.: ?origem=grupo-pitangui) para saber de onde veio cada visita." />
      <select aria-label="Período" value={dias} onChange={(e) => setDias(+e.target.value)} style={{ maxWidth: 200 }}>
        <option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option><option value={365}>Último ano</option>
      </select>
      {erro && <div className="destaque alerta">Não foi possível carregar os acessos.</div>}
      {a && (
        <>
          <div className="kpis"><div className="kpi"><b>{a.visitas}</b><span>Visitas</span></div><div className="kpi"><b>{a.pessoas}</b><span>Pessoas</span></div></div>
          <section className="adm-cartao"><h3>Visitas por dia</h3><Barras linhas={a.por_dia.slice(-31).map((d): [string, number] => [d.dia.slice(8) + '/' + d.dia.slice(5, 7), d.visitas])} /></section>
          <div className="duas">
            <section className="adm-cartao"><h3>De onde vêm</h3><Barras linhas={a.origens.map((o): [string, number] => [o.origem, o.visitas])} /></section>
            <section className="adm-cartao"><h3>Abas vistas</h3><Barras linhas={Object.entries(a.paginas).sort((x, y) => y[1] - x[1]).map(([k, v]): [string, number] => [nomes[k] || k, v])} /></section>
          </div>
          <section className="adm-cartao"><h3>Aparelho</h3><Barras linhas={Object.entries(a.dispositivos).map(([k, v]): [string, number] => [k === 'celular' ? 'Celular' : 'Computador', v])} /></section>
        </>
      )}
    </>
  );
}

function Denuncias({ lista, aoMudar }: { lista: DenunciaAdmin[]; aoMudar(): void }) {
  const { problemas, regras, aviso, avisoErro, recarregar } = useApp();
  const pend = problemas.filter((p) => p.status !== 'removido' && (p.denuncias_pendentes > 0 || p.graves_pendentes > 0)).sort((a, b) => b.graves_pendentes - a.graves_pendentes || b.denuncias_pendentes - a.denuncias_pendentes);
  const motivos = (id: string) => {
    const m: Record<string, number> = {};
    lista.filter((d) => d.problema_id === id).forEach((d) => { m[d.motivo] = (m[d.motivo] || 0) + 1; });
    return Object.entries(m);
  };
  const agir = async (id: string, acao: 'manter' | 'remover') => {
    if (acao === 'remover' && !confirm('Remover esta publicação? O texto e as fotos serão apagados de vez.')) return;
    try {
      await backend.admin.moderar(id, acao);
      await recarregar();
      aoMudar();
      aviso(acao === 'manter' ? 'Publicação mantida.' : 'Publicação removida.');
    } catch (e) { avisoErro(e, 'Não foi possível salvar.'); }
  };
  return (
    <>
      <Cab t="Denúncias" s={`Com ${regras.denuncias_ocultar} ou mais denúncias, ou uma denúncia grave, a publicação sai do mapa até você decidir. "Manter" zera as denúncias atuais.`} />
      {pend.length ? pend.map((p) => (
        <article className="adm-cartao" key={p.id}>
          <div className="linha entre">
            <div>
              <b>{p.titulo}</b> {estaOculto(p, regras) && <span className="status st-removido">Oculto do mapa</span>} {p.graves_pendentes > 0 && <span className="status st-grave">Denúncia grave</span>}
              <div className="suave">{enderecoCurto(p)} · {p.localidade} · por {p.autor_nome} em {dataHora(p.criado_em)} · {p.apoios} apoios</div>
            </div>
            <span className="contagem">{p.denuncias_pendentes}</span>
          </div>
          <p className="descricao">{p.descricao}</p>
          {p.fotos.length > 0 && <div className="adm-fotos">{p.fotos.map((f) => <img key={f} src={backend.urlFoto(f)} alt="Foto denunciada" />)}</div>}
          <div className="chips-texto">{motivos(p.id).map(([m, n]) => <span className="etiqueta" key={m}>{m}{n > 1 ? ` · ${n}` : ''}</span>)}</div>
          <div className="linha">
            <button type="button" className="btn peq perigo" onClick={() => agir(p.id, 'remover')}>Remover</button>
            <button type="button" className="btn peq claro" onClick={() => agir(p.id, 'manter')}>Manter publicada</button>
            <button type="button" className="btn peq claro" onClick={() => navegar(`/problema/${p.id}`)}>Ver no mapa</button>
          </div>
        </article>
      )) : <div className="vazio">Nenhuma denúncia aguardando revisão.</div>}
    </>
  );
}

function Problemas() {
  const { problemas, aviso, avisoErro, recarregar } = useApp();
  const [q, setQ] = useState('');
  const [st, setSt] = useState('');
  const [zona, setZona] = useState('');
  const lista = useMemo(() => {
    const n = normalizar(q);
    return problemas
      .filter((p) => (!st || p.status === st) && (!zona || p.zona === zona) && (!n || normalizar([p.titulo, p.via, p.numero, p.localidade, p.descricao, NOME_CATEGORIA[p.categoria]].join(' ')).includes(n)))
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }, [problemas, q, st, zona]);

  const mudar = async (p: Problema, novo: string) => {
    try {
      if (novo === 'removido') {
        if (!confirm('Remover esta publicação? O texto e as fotos serão apagados de vez.')) return;
        await backend.admin.moderar(p.id, 'remover');
      } else {
        const nota = novo === 'aberto' ? '' : prompt('Nota pública para o histórico (opcional):', '') ?? '';
        await backend.admin.mudarStatus(p.id, novo as Exclude<Status, 'removido'>, nota);
      }
      await recarregar();
      aviso(`Status atualizado: ${STATUS_NOME[novo as Status]}.`);
    } catch (e) { avisoErro(e, 'Não foi possível salvar.'); }
  };
  return (
    <>
      <Cab t="Problemas" s="Mude o status conforme o problema avança. Resolvidos ficam verdes no mapa e saem das prioridades." />
      <div className="linha adm-filtros">
        <input type="search" aria-label="Buscar problema" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por rua, bairro ou descrição" style={{ flex: 1, minWidth: 200 }} />
        <select aria-label="Status" value={st} onChange={(e) => setSt(e.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS_NOME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Zona" value={zona} onChange={(e) => setZona(e.target.value)}><option value="">Todas as zonas</option>{ZONAS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button type="button" className="btn claro" disabled={!lista.length} onClick={() => baixarArquivo(`melhora-extremoz-problemas-${new Date().toISOString().slice(0, 10)}.csv`, problemasParaCsv(lista.filter((p) => p.status !== 'removido')))}>Exportar planilha</button>
      </div>
      <div className="adm-cartao sem-recuo"><div className="tabela-rolagem"><table className="tabela">
        <thead><tr><th>Problema</th><th>Zona</th><th className="num">Apoios</th><th className="num">Denúncias</th><th>Publicado</th><th>Status</th></tr></thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id}>
              <td>{p.status === 'removido' ? <i className="suave">Removida pela moderação</i> : <button type="button" className="link" onClick={() => navegar(`/problema/${p.id}`)}>{p.titulo}</button>}<br /><small className="suave">{enderecoCurto(p)} · {p.localidade}</small></td>
              <td>{NOME_ZONA[p.zona]}</td>
              <td className="num">{p.apoios}</td>
              <td className="num">{p.denuncias_pendentes || p.denuncias_total}</td>
              <td className="suave">{dataCurta(p.criado_em)}<br />{p.autor_nome}</td>
              <td>
                <select aria-label={`Status de ${p.titulo}`} value={p.status} disabled={p.status === 'removido'} onChange={(e) => mudar(p, e.target.value)}>
                  {Object.entries(STATUS_NOME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>{!lista.length && <div className="vazio">Nenhum problema encontrado.</div>}</div>
    </>
  );
}

function Mensagens({ lista, aoMudar }: { lista: Mensagem[]; aoMudar(): void }) {
  const { avisoErro, aviso } = useApp();
  return (
    <>
      <Cab t="Mensagens" s="Tudo o que chega pelo Fale com a gente." />
      {lista.length ? lista.map((m) => (
        <article className={`adm-cartao${m.lida ? ' lida' : ''}`} key={m.id}>
          <div className="linha entre">
            <div><b>{m.assunto}</b><div className="suave">{m.email} · {dataHora(m.em)}</div></div>
            <div className="linha">
              <button type="button" className="btn peq claro" onClick={async () => aviso((await copiar(m.email)) ? 'E-mail copiado.' : 'Não foi possível copiar.')}>Copiar e-mail</button>
              <button type="button" className="btn peq claro" onClick={async () => { try { await backend.admin.marcarLida(m.id, !m.lida); aoMudar(); } catch (e) { avisoErro(e, 'Não foi possível salvar.'); } }}>{m.lida ? 'Marcar como nova' : 'Marcar como lida'}</button>
            </div>
          </div>
          <p className="descricao">{m.texto}</p>
        </article>
      )) : <div className="vazio">Nenhuma mensagem ainda.</div>}
    </>
  );
}

function Usuarios() {
  const { sessao, aviso, avisoErro } = useApp();
  const [lista, setLista] = useState<UsuarioAdmin[] | null>(null);
  const carregar = useCallback(() => backend.admin.usuarios().then(setLista).catch((e) => avisoErro(e, 'Não foi possível carregar.')), [avisoErro]);
  useEffect(() => { carregar(); }, [carregar]);
  return (
    <>
      <Cab t="Usuários" s="Suspender impede a pessoa de publicar, apoiar, comentar e denunciar." />
      <div className="adm-cartao sem-recuo"><div className="tabela-rolagem"><table className="tabela">
        <thead><tr><th>Pessoa</th><th className="num">Problemas</th><th className="num">Apoios</th><th className="num">Comentários</th><th className="num">Den. feitas</th><th className="num">Den. recebidas</th><th /></tr></thead>
        <tbody>
          {(lista || []).map((u) => (
            <tr key={u.id}>
              <td><b>{u.id === sessao?.id ? 'Você' : u.nome}</b>{u.suspenso && <span className="status st-removido"> Suspenso</span>}<br /><small className="suave">desde {dataCurta(u.criado_em)}</small></td>
              <td className="num">{u.problemas}</td><td className="num">{u.apoios}</td><td className="num">{u.comentarios}</td><td className="num">{u.denuncias_feitas}</td><td className="num">{u.denuncias_recebidas}</td>
              <td>{u.id !== sessao?.id && <button type="button" className={`btn peq ${u.suspenso ? 'claro' : 'perigo'}`} onClick={async () => { try { await backend.admin.suspender(u.id, !u.suspenso); await carregar(); aviso(u.suspenso ? 'Conta reativada.' : 'Conta suspensa.'); } catch (e) { avisoErro(e, 'Não foi possível salvar.'); } }}>{u.suspenso ? 'Reativar' : 'Suspender'}</button>}</td>
            </tr>
          ))}
        </tbody>
      </table></div>{lista && !lista.length && <div className="vazio">Ninguém participou ainda.</div>}</div>
    </>
  );
}

function PatrocinioAdm() {
  const { patrocinios, aviso, avisoErro, recarregar } = useApp();
  const [lista, setLista] = useState<Patrocinio[]>(patrocinios);
  useEffect(() => setLista(patrocinios), [patrocinios]);
  const muda = (i: number, c: Partial<Patrocinio>) => setLista((l) => l.map((p, k) => (k === i ? { ...p, ...c } : p)));
  const salvar = async () => {
    if (lista.some((p) => !p.titulo.trim())) { aviso('Todo banner precisa de um título.'); return; }
    if (lista.some((p) => p.url && !/^https?:\/\//.test(p.url))) { aviso('O link precisa começar com https://'); return; }
    try {
      await backend.admin.salvarPatrocinios(lista.map((p) => ({ ...p, url: p.url || null })));
      await recarregar();
      aviso('Banners salvos.');
    } catch (e) { avisoErro(e, 'Não foi possível salvar.'); }
  };
  return (
    <>
      <Cab t="Patrocínio" s="Os espaços ficam invisíveis até existir um banner ativo. Vários banners no mesmo espaço se revezam." />
      {lista.map((p, i) => (
        <section className={`adm-cartao${p.ativo ? '' : ' pausado'}`} key={p.id}>
          <div className="linha entre">
            <h3>Banner {i + 1}{p.patrocinador ? ` · ${p.patrocinador}` : ''}</h3>
            <div className="linha">
              <label className="marcar"><input type="checkbox" checked={p.ativo} onChange={(e) => muda(i, { ativo: e.target.checked })} /> Ativo</label>
              <button type="button" className="btn peq claro" onClick={() => setLista((l) => l.filter((_, k) => k !== i))}>Excluir</button>
            </div>
          </div>
          <div className="duas">
            <label><span className="rotulo">Patrocinador</span><input type="text" maxLength={60} value={p.patrocinador} onChange={(e) => muda(i, { patrocinador: e.target.value })} /></label>
            <label><span className="rotulo">Link (opcional)</span><input type="url" value={p.url || ''} placeholder="https://" onChange={(e) => muda(i, { url: e.target.value })} /></label>
          </div>
          <label><span className="rotulo">Título</span><input type="text" maxLength={70} value={p.titulo} onChange={(e) => muda(i, { titulo: e.target.value })} /></label>
          <label><span className="rotulo">Texto</span><input type="text" maxLength={180} value={p.texto} onChange={(e) => muda(i, { texto: e.target.value })} /></label>
          <div className="duas">
            <label><span className="rotulo">Texto do botão</span><input type="text" maxLength={24} value={p.botao} onChange={(e) => muda(i, { botao: e.target.value })} /></label>
            <label><span className="rotulo">Segundos na tela</span><input type="number" min={3} max={300} value={p.segundos} onChange={(e) => muda(i, { segundos: Math.max(3, Math.min(300, +e.target.value || 10)) })} /></label>
          </div>
          <div>
            <span className="rotulo">Imagem (opcional)</span>
            <div className="linha">
              {p.imagem && <img className="pat-previa" src={backend.urlFoto(p.imagem)} alt="" />}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Imagem do banner" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 8 * 1024 * 1024) { aviso('Use uma imagem de até 8 MB.'); return; }
                try { const c = await backend.enviarFoto(f); muda(i, { imagem: c }); aviso('Imagem enviada. Salve os banners para publicar.'); } catch (x) { avisoErro(x, 'A imagem não foi enviada.'); }
              }} />
              {p.imagem && <button type="button" className="btn peq claro" onClick={() => muda(i, { imagem: null })}>Remover imagem</button>}
            </div>
          </div>
          <div>
            <span className="rotulo">Onde aparece</span>
            <div className="chips-marcar">
              {ESPACOS.map(([k, n, d]) => (
                <label className="marcar" key={k} title={d}>
                  <input type="checkbox" checked={p.espacos.includes(k)} onChange={(e) => muda(i, { espacos: e.target.checked ? [...p.espacos, k as EspacoId] : p.espacos.filter((x) => x !== k) })} /> {n}
                </label>
              ))}
            </div>
          </div>
        </section>
      ))}
      {!lista.length && <div className="vazio">Nenhum banner. Todos os espaços ficam ocultos.</div>}
      <div className="linha">
        <button type="button" className="btn claro" onClick={() => setLista((l) => [...l, { id: crypto.randomUUID(), patrocinador: '', titulo: 'Novo banner', texto: '', botao: 'Saiba mais', url: null, imagem: null, ativo: false, espacos: ['mapa'], segundos: 10, ordem: l.length }])}>+ Novo banner</button>
        <button type="button" className="btn" onClick={salvar}>Salvar banners</button>
      </div>
    </>
  );
}

function RegrasAdm() {
  const { regras, aviso, avisoErro, recarregar } = useApp();
  const [r, setR] = useState<Regras>(regras);
  useEffect(() => setR(regras), [regras]);
  const campo = (k: keyof Regras, rotulo: string, min: number, max: number) => (
    <label><span className="rotulo">{rotulo}</span><input type="number" min={min} max={max} value={r[k]} style={{ maxWidth: 160 }} onChange={(e) => setR({ ...r, [k]: +e.target.value })} /></label>
  );
  const limites: [keyof Regras, number, number][] = [['publicacoes_por_janela', 1, 50], ['janela_horas', 1, 168], ['denuncias_ocultar', 1, 50], ['idade_minima_denuncia_horas', 0, 720]];
  return (
    <>
      <Cab t="Regras" s="Valem no servidor, para todo mundo, assim que você salvar." />
      <section className="adm-cartao">
        {campo('publicacoes_por_janela', 'Problemas que cada pessoa pode publicar por janela', 1, 50)}
        {campo('janela_horas', 'Tamanho da janela (horas)', 1, 168)}
        {campo('denuncias_ocultar', 'Denúncias para ocultar uma publicação', 1, 50)}
        {campo('idade_minima_denuncia_horas', 'Idade mínima da conta para denunciar (horas)', 0, 720)}
        <div><button type="button" className="btn" onClick={async () => {
          if (limites.some(([k, a, b]) => !(r[k] >= a && r[k] <= b))) { aviso('Confira os valores: algum está fora do limite permitido.'); return; }
          try { await backend.admin.salvarRegras(r); await recarregar(); aviso('Regras salvas.'); } catch (e) { avisoErro(e, 'Não foi possível salvar.'); }
        }}>Salvar regras</button></div>
      </section>
    </>
  );
}

function CadastroDuasEtapas({ aoFechar }: { aoFechar(): void }) {
  const [c, setC] = useState<CadastroMfa | null>(null);
  const [cod, setCod] = useState('');
  const [erro, setErro] = useState('');
  const { aviso } = useApp();
  useEffect(() => { backend.admin.mfaCadastrar().then(setC).catch(() => { aviso('Não foi possível iniciar agora.'); aoFechar(); }); }, [aviso, aoFechar]);
  if (!c) return null;
  return (
    <Modal aoFechar={aoFechar} rotulo="Proteger o painel">
      <h2>Proteger o painel</h2>
      <p>1. No celular, abra um app autenticador (Google Authenticator, Microsoft Authenticator ou Authy) e leia este código:</p>
      <img src={c.qr} alt="Código QR para o app autenticador" className="qr" />
      <p className="suave">Sem câmera? Digite esta chave: <b style={{ wordBreak: 'break-all' }}>{c.segredo}</b></p>
      <p>2. Digite o código de 6 números do app:</p>
      <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="codigo" aria-label="Código de 6 números" value={cod} onChange={(e) => setCod(e.target.value)} />
      {erro && <p className="destaque alerta">{erro}</p>}
      <div className="linha">
        <button type="button" className="btn claro" onClick={aoFechar}>Agora não</button>
        <button type="button" className="btn" onClick={async () => { try { await backend.admin.mfaConfirmar(c.id, cod); location.reload(); } catch { setErro('Código inválido. Confira o horário do celular e tente o código novo.'); } }}>Ativar</button>
      </div>
      <p className="suave">Guarde a chave acima em lugar seguro: se perder o celular, ela recupera o acesso.</p>
    </Modal>
  );
}

function TelaCodigo({ fator }: { fator: string }) {
  const [cod, setCod] = useState('');
  const [erro, setErro] = useState('');
  const vai = async () => {
    try { await backend.admin.mfaConfirmar(fator, cod); location.reload(); } catch { setErro('Código inválido ou vencido. Tente o código novo do app.'); }
  };
  return (
    <section className="pagina"><div className="largura estreita"><div className="adm-cartao">
      <h2>Verificação em duas etapas</h2>
      <p className="suave">Abra o app autenticador e digite o código de 6 números.</p>
      <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="codigo" aria-label="Código de 6 números" value={cod} onChange={(e) => setCod(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') vai(); }} />
      {erro && <p className="destaque alerta">{erro}</p>}
      <button type="button" className="btn" onClick={vai}>Confirmar</button>
    </div></div></section>
  );
}

export default function Painel() {
  const { sessao, carregouSessao, abrirModal, problemas } = useApp();
  const [aba, setAba] = useState<Aba>('geral');
  const [mfa, setMfa] = useState<EstadoMfa | null>(null);
  const [protegendo, setProtegendo] = useState(false);
  const [denuncias, setDenuncias] = useState<DenunciaAdmin[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const admin = !!sessao?.isAdmin;

  useEffect(() => { if (sessao?.adminCadastrado) backend.admin.mfaEstado().then(setMfa).catch(() => {}); }, [sessao?.adminCadastrado]);
  const carregar = useCallback(() => {
    backend.admin.denuncias().then(setDenuncias).catch(() => {});
    backend.admin.mensagens().then(setMensagens).catch(() => {});
  }, []);
  useEffect(() => { if (admin) carregar(); }, [admin, carregar, problemas]);

  if (!carregouSessao) return <section className="pagina"><div className="vazio">Carregando…</div></section>;
  if (sessao?.adminCadastrado && !admin && mfa?.fatores.length) return <TelaCodigo fator={mfa.fatores[0].id} />;
  if (!admin) {
    return (
      <section className="pagina"><div className="largura estreita"><div className="vazio grande">
        <b>Área restrita à administração</b>
        {sessao ? <p>Você entrou como {sessao.email}, que não é uma conta de administrador.</p> : <button type="button" className="btn" onClick={() => abrirModal('login')}>Entrar</button>}
        <button type="button" className="link" onClick={() => navegar('/')}>Voltar ao mapa</button>
      </div></div></section>
    );
  }

  const pend = problemas.filter((p) => p.status !== 'removido' && (p.denuncias_pendentes > 0 || p.graves_pendentes > 0)).length;
  const novas = mensagens.filter((m) => !m.lida).length;
  const abas: [Aba, string, number][] = [['geral', 'Visão geral', 0], ['acessos', 'Acessos', 0], ['denuncias', 'Denúncias', pend], ['problemas', 'Problemas', 0], ['mensagens', 'Mensagens', novas], ['usuarios', 'Usuários', 0], ['patrocinio', 'Patrocínio', 0], ['regras', 'Regras', 0]];

  return (
    <section className="pagina painel-adm"><div className="adm-grade">
      <nav className="adm-menu" aria-label="Seções do painel">
        {abas.map(([k, v, n]) => <button type="button" key={k} aria-current={aba === k ? 'page' : undefined} onClick={() => setAba(k)}>{v}{n > 0 && <span className="adm-n">{n}</span>}</button>)}
      </nav>
      <div className="adm-corpo">
        {backend.modo === 'supabase' && mfa && !mfa.fatores.length && (
          <div className="destaque alerta com-botao"><span><b>Proteja o painel.</b> Ative a verificação em duas etapas: sem o código do seu celular, ninguém entra aqui.</span><button type="button" className="btn peq" onClick={() => setProtegendo(true)}>Ativar agora</button></div>
        )}
        {protegendo && <CadastroDuasEtapas aoFechar={() => setProtegendo(false)} />}
        {aba === 'geral' && <Geral irPara={setAba} denuncias={pend} mensagens={novas} />}
        {aba === 'acessos' && <Acessos />}
        {aba === 'denuncias' && <Denuncias lista={denuncias} aoMudar={carregar} />}
        {aba === 'problemas' && <Problemas />}
        {aba === 'mensagens' && <Mensagens lista={mensagens} aoMudar={carregar} />}
        {aba === 'usuarios' && <Usuarios />}
        {aba === 'patrocinio' && <PatrocinioAdm />}
        {aba === 'regras' && <RegrasAdm />}
      </div>
    </div></section>
  );
}
