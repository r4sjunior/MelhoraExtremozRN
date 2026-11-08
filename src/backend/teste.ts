// Modo de teste: reproduz as regras do servidor dentro do navegador, sem contas nem rede.
// Só é usado quando VITE_SUPABASE_URL está vazio; os dados são fictícios e ficam neste aparelho.
import type { Comentario, EventoHistorico, Mensagem, Patrocinio, PainelAcessos, Problema, Regras, Sessao, UsuarioAdmin } from '../types';
import { MOTIVO_GRAVE, REGRAS_PADRAO } from '../dados/constantes';
import { idbApagar, idbGravar, idbLer } from '../lib/idb';
import { ErroRegra, type Backend } from './tipos';

interface Usuario { id: string; nome: string; nomeEscolhido: boolean; admin: boolean; suspenso: boolean; criado_em: string }
interface Estado {
  usuarios: Usuario[];
  logado: string | null;
  regras: Regras;
  problemas: Problema[];
  apoios: { p: string; u: string }[];
  comentarios: Comentario[];
  denuncias: { p: string; u: string; motivo: string; grave: boolean; revisada: boolean }[];
  historico: (EventoHistorico & { p: string })[];
  publicacoes: { u: string; em: number }[];
  mensagens: Mensagem[];
  patrocinios: Patrocinio[];
  visitas: { s: string; v: string; d: string; o: string; pg: string[]; em: string }[];
}

const CHAVE = 'estado-teste-v1';
const agoraIso = (menosDias = 0) => new Date(Date.now() - menosDias * 86400000).toISOString();

function exemplos(): Estado {
  const pessoas: Usuario[] = ['Maria do Centro', 'João de Pitangui', 'Morador(a)', 'Ana de Genipabu'].map((nome, i) => ({
    id: `exemplo-${i + 1}`, nome, nomeEscolhido: true, admin: false, suspenso: false, criado_em: agoraIso(60),
  }));
  const base = (i: number, autor: number, categoria: string, titulo: string, descricao: string, via: string, numero: string | null, localidade: string, zona: Problema['zona'], lat: number, lon: number, apoios: number, dias: number, status: Problema['status'] = 'aberto', protocolo: string | null = null): Problema => ({
    id: `exemplo-p${i}`, autor_id: `exemplo-${autor}`, autor_nome: pessoas[autor - 1].nome, categoria, titulo, descricao, via, numero, referencia: null, localidade, zona, lat, lon, fotos: [], status, protocolo,
    apoios, comentarios: 0, denuncias_pendentes: 0, graves_pendentes: 0, denuncias_total: 0, criado_em: agoraIso(dias), atualizado_em: agoraIso(dias),
  });
  const problemas = [
    base(1, 1, 'buraco', 'Buraco em frente à praça', 'EXEMPLO FICTÍCIO. Buraco grande na faixa da direita, carros desviam pela contramão.', 'Rua Felipe Camarão', '200', 'Centro', 'sede', -5.7053, -35.3056, 34, 21),
    base(2, 2, 'iluminacao', 'Postes apagados na orla', 'EXEMPLO FICTÍCIO. Três postes seguidos sem luz há semanas, trecho fica escuro à noite.', 'Avenida Litorânea', null, 'Pitangui', 'litoral', -5.6355, -35.2215, 12, 9, 'andamento', '2026-000123'),
    base(3, 3, 'lixo', 'Entulho acumulado', 'EXEMPLO FICTÍCIO. Restos de obra e lixo doméstico jogados no terreno, atraindo bichos.', 'Rua Principal', '45', 'Redinha Nova', 'genipabu', -5.7265, -35.2075, 5, 4),
    base(4, 4, 'erosao', 'Areia cobrindo a via', 'EXEMPLO FICTÍCIO. Depois da chuva a areia desce e cobre metade da pista perto das dunas.', 'Rua Principal', null, 'Genipabu', 'genipabu', -5.6945, -35.2160, 62, 40),
    base(5, 1, 'alagamento', 'Rua alaga quando chove', 'EXEMPLO FICTÍCIO. Água sobe até a calçada e demora dias para escoar, pedestres não passam.', 'Rua Principal', '310', 'Estivas', 'estivas', -5.6726, -35.2727, 3, 2),
    base(6, 2, 'sinalizacao', 'Faixa de pedestre apagada', 'EXEMPLO FICTÍCIO. A faixa em frente à escola sumiu e os carros não reduzem a velocidade.', 'Rua Principal', '12', 'Moinho dos Ventos', 'moinho', -5.6879, -35.2745, 1, 1),
    base(7, 3, 'iluminacao', 'Lâmpada trocada', 'EXEMPLO FICTÍCIO. O poste foi consertado depois de duas semanas de cobrança dos vizinhos.', 'Rua Principal', '88', 'Vila Nova', 'moinho', -5.6990, -35.2645, 18, 30, 'resolvido', '2026-000087'),
  ];
  const historico: Estado['historico'] = problemas.flatMap((p, i) => {
    const h: Estado['historico'] = [{ id: `h${i}a`, p: p.id, status: 'aberto', protocolo: null, nota: null, em: p.criado_em }];
    if (p.status !== 'aberto') h.push({ id: `h${i}b`, p: p.id, status: p.status, protocolo: p.protocolo, nota: null, em: agoraIso(1) });
    return h;
  });
  const comentarios: Comentario[] = [{ id: 'c1', problema_id: 'exemplo-p1', autor_id: 'exemplo-2', autor_nome: 'João de Pitangui', texto: 'Comentário de exemplo: passei hoje e continua igual.', em: agoraIso(3) }];
  problemas[0].comentarios = 1;
  return {
    usuarios: pessoas, logado: null, regras: { ...REGRAS_PADRAO, idade_minima_denuncia_horas: 0 }, problemas, apoios: [], comentarios, denuncias: [], historico,
    publicacoes: [], mensagens: [], patrocinios: [], visitas: [],
  };
}

export function criarBackendTeste(): Backend {
  let E: Estado | null = null;
  const ouvintes = new Set<() => void>();
  let aoMudar: (() => void) | null = null;

  const est = async () => (E ||= (await idbLer<Estado>(CHAVE)) || exemplos());
  const salva = async () => { await idbGravar(CHAVE, E); };
  const notifica = () => ouvintes.forEach((f) => f());
  const atraso = () => new Promise((ok) => setTimeout(ok, 120));
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

  async function usuario(): Promise<Usuario> {
    const e = await est();
    const u = e.usuarios.find((x) => x.id === e.logado);
    if (!u) throw new ErroRegra('Entre na sua conta para continuar.');
    return u;
  }
  async function naoSuspenso(acao: string) {
    const u = await usuario();
    if (u.suspenso) throw new ErroRegra(`Sua conta está suspensa e não pode ${acao}.`);
    return u;
  }
  async function exigeAdmin() {
    const u = await usuario();
    if (!u.admin) throw new ErroRegra('Área restrita à administração.');
    return u;
  }
  const publico = (p: Problema, r: Regras) => p.status !== 'removido' && p.graves_pendentes === 0 && p.denuncias_pendentes < r.denuncias_ocultar;
  function achar(e: Estado, id: string) {
    const p = e.problemas.find((x) => x.id === id);
    if (!p) throw new ErroRegra('Esse problema não está mais disponível.');
    return p;
  }
  function historiar(e: Estado, p: Problema, nota: string | null = null) {
    e.historico.push({ id: crypto.randomUUID(), p: p.id, status: p.status, protocolo: p.protocolo, nota, em: new Date().toISOString() });
  }

  return {
    modo: 'teste',
    captchaSiteKey: '',

    async sessao(): Promise<Sessao | null> {
      const e = await est();
      const u = e.usuarios.find((x) => x.id === e.logado);
      if (!u) return null;
      return { id: u.id, email: 'teste@exemplo.local', nome: u.nome, nomeEscolhido: u.nomeEscolhido, adminCadastrado: u.admin, isAdmin: u.admin, suspenso: u.suspenso };
    },
    aoMudarSessao(cb) { aoMudar = cb; },
    async googleAtivo() { return false; },
    async entrarGoogle() { throw new ErroRegra('No modo de teste, use o formulário de teste.'); },
    async entrarEmail() { throw new ErroRegra('No modo de teste, use o formulário de teste.'); },
    async entrarTeste(nome, admin) {
      const e = await est();
      const id = admin ? 'teste-admin' : 'teste-morador';
      let u = e.usuarios.find((x) => x.id === id);
      if (!u) { u = { id, nome: nome || 'Morador(a)', nomeEscolhido: !!nome, admin, suspenso: false, criado_em: new Date().toISOString() }; e.usuarios.push(u); }
      else if (nome) { u.nome = nome; u.nomeEscolhido = true; }
      e.logado = id;
      await salva();
      aoMudar?.();
    },
    async sair() {
      const e = await est();
      e.logado = null;
      await salva();
      aoMudar?.();
    },
    async excluirConta() {
      const u = await usuario();
      const e = await est();
      const meus = new Set(e.problemas.filter((p) => p.autor_id === u.id).map((p) => p.id));
      e.problemas = e.problemas.filter((p) => p.autor_id !== u.id);
      e.apoios.filter((a) => a.u === u.id).forEach((a) => { const p = e.problemas.find((x) => x.id === a.p); if (p) p.apoios--; });
      e.apoios = e.apoios.filter((a) => a.u !== u.id && !meus.has(a.p));
      e.comentarios.filter((c) => c.autor_id === u.id).forEach((c) => { const p = e.problemas.find((x) => x.id === c.problema_id); if (p) p.comentarios--; });
      e.comentarios = e.comentarios.filter((c) => c.autor_id !== u.id && !meus.has(c.problema_id));
      e.denuncias = e.denuncias.filter((d) => d.u !== u.id && !meus.has(d.p));
      e.usuarios = e.usuarios.filter((x) => x.id !== u.id);
      e.logado = null;
      await salva();
      aoMudar?.();
      notifica();
    },
    async mudarNome(nome) {
      const u = await usuario();
      u.nome = nome;
      u.nomeEscolhido = true;
      const e = await est();
      e.problemas.forEach((p) => { if (p.autor_id === u.id) p.autor_nome = nome; });
      await salva();
      notifica();
    },

    async regras() { return clone((await est()).regras); },
    async problemas() {
      const e = await est();
      const u = e.usuarios.find((x) => x.id === e.logado);
      await atraso();
      return clone(e.problemas.filter((p) => publico(p, e.regras) || p.autor_id === u?.id || u?.admin));
    },
    assinarProblemas(cb) { ouvintes.add(cb); return () => { ouvintes.delete(cb); }; },
    async publicar(n) {
      const u = await naoSuspenso('publicar');
      const e = await est();
      if (e.problemas.some((p) => p.id === n.id)) return;
      const janela = e.regras.janela_horas * 3600000;
      const recentes = e.publicacoes.filter((x) => x.u === u.id && Date.now() - x.em < janela).length;
      if (recentes >= e.regras.publicacoes_por_janela) throw new ErroRegra(`Limite atingido: ${e.regras.publicacoes_por_janela} publicação(ões) a cada ${e.regras.janela_horas} hora(s). Enquanto isso, apoie e comente.`);
      const agora = new Date().toISOString();
      const p: Problema = { ...n, autor_id: u.id, autor_nome: u.nome, status: 'aberto', protocolo: null, apoios: 1, comentarios: 0, denuncias_pendentes: 0, graves_pendentes: 0, denuncias_total: 0, criado_em: agora, atualizado_em: agora };
      e.problemas.unshift(p);
      e.publicacoes.push({ u: u.id, em: Date.now() });
      historiar(e, p);
      await salva();
      notifica();
    },
    async excluirProblema(p) {
      const u = await usuario();
      const e = await est();
      if (p.autor_id !== u.id) throw new ErroRegra('Só quem publicou pode excluir.');
      e.problemas = e.problemas.filter((x) => x.id !== p.id);
      await salva();
      notifica();
    },
    async minhasPublicacoesRecentes() {
      const e = await est();
      return e.publicacoes.filter((x) => x.u === e.logado).map((x) => x.em).sort((a, b) => b - a);
    },

    async meusApoios() {
      const e = await est();
      return e.apoios.filter((a) => a.u === e.logado).map((a) => a.p);
    },
    async apoiar(id, ligado) {
      const u = await naoSuspenso('apoiar');
      const e = await est();
      const p = achar(e, id);
      if (p.autor_id === u.id) throw new ErroRegra('Quem publica já conta como o primeiro apoio.');
      const ja = e.apoios.some((a) => a.p === id && a.u === u.id);
      if (ligado && !ja) { e.apoios.push({ p: id, u: u.id }); p.apoios++; }
      if (!ligado && ja) { e.apoios = e.apoios.filter((a) => !(a.p === id && a.u === u.id)); p.apoios--; }
      await salva();
      notifica();
    },
    async minhasDenuncias() {
      const e = await est();
      return e.denuncias.filter((d) => d.u === e.logado).map((d) => d.p);
    },
    async denunciar(id, motivo) {
      const u = await naoSuspenso('denunciar');
      const e = await est();
      const p = achar(e, id);
      if (p.autor_id === u.id) throw new ErroRegra('Você não pode denunciar a própria publicação.');
      if (e.denuncias.some((d) => d.p === id && d.u === u.id)) return;
      const grave = motivo === MOTIVO_GRAVE;
      e.denuncias.push({ p: id, u: u.id, motivo, grave, revisada: false });
      p.denuncias_pendentes++;
      p.denuncias_total++;
      if (grave) p.graves_pendentes++;
      await salva();
      notifica();
    },

    async comentarios(id) {
      return clone((await est()).comentarios.filter((c) => c.problema_id === id).sort((a, b) => a.em.localeCompare(b.em)));
    },
    async comentar(id, texto) {
      const u = await naoSuspenso('comentar');
      const e = await est();
      const p = achar(e, id);
      e.comentarios.push({ id: crypto.randomUUID(), problema_id: id, autor_id: u.id, autor_nome: u.nome, texto: texto.trim(), em: new Date().toISOString() });
      p.comentarios++;
      await salva();
      notifica();
    },
    async excluirComentario(id) {
      const u = await usuario();
      const e = await est();
      const c = e.comentarios.find((x) => x.id === id);
      if (!c || (c.autor_id !== u.id && !u.admin)) return;
      e.comentarios = e.comentarios.filter((x) => x.id !== id);
      const p = e.problemas.find((x) => x.id === c.problema_id);
      if (p) p.comentarios--;
      await salva();
      notifica();
    },
    async historico(id) {
      return clone((await est()).historico.filter((h) => h.p === id));
    },
    async definirProtocolo(id, protocolo) {
      const u = await usuario();
      const e = await est();
      const p = achar(e, id);
      if (p.autor_id !== u.id && !u.admin) throw new ErroRegra('Só quem publicou pode informar o protocolo.');
      p.protocolo = protocolo.trim().slice(0, 40) || null;
      historiar(e, p);
      await salva();
      notifica();
    },

    // As fotos do modo de teste ficam embutidas nos dados, como data URL.
    enviarFoto(blob) {
      return new Promise((ok, falha) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.onerror = () => falha(r.error);
        r.readAsDataURL(blob);
      });
    },
    urlFoto: (c) => (c.startsWith('data:image/') ? c : ''),
    async apagarFotos() { /* somem junto com o problema */ },

    async patrocinios() { return clone((await est()).patrocinios); },
    async enviarMensagem(email, assunto, texto) {
      const e = await est();
      e.mensagens.unshift({ id: crypto.randomUUID(), email, assunto, texto, lida: false, em: new Date().toISOString() });
      await salva();
    },
    async registrarVisita(s, v, pagina, d, o) {
      const e = await est();
      const x = e.visitas.find((y) => y.s === s);
      if (x) { if (!x.pg.includes(pagina)) x.pg.push(pagina); } else e.visitas.push({ s, v, d, o, pg: [pagina], em: new Date().toISOString() });
      await salva();
    },

    admin: {
      async denuncias() {
        await exigeAdmin();
        return (await est()).denuncias.filter((d) => !d.revisada).map((d) => ({ problema_id: d.p, motivo: d.motivo, grave: d.grave, revisada: d.revisada }));
      },
      async moderar(id, acao) {
        await exigeAdmin();
        const e = await est();
        const p = achar(e, id);
        e.denuncias.forEach((d) => { if (d.p === id) d.revisada = true; });
        p.denuncias_pendentes = 0;
        p.graves_pendentes = 0;
        if (acao === 'remover') {
          Object.assign(p, { status: 'removido', titulo: '', descricao: '', fotos: [], numero: null, referencia: null });
          historiar(e, p);
        }
        await salva();
        notifica();
      },
      async mudarStatus(id, status, nota) {
        await exigeAdmin();
        const e = await est();
        const p = achar(e, id);
        if (p.status === 'removido') return;
        p.status = status;
        p.atualizado_em = new Date().toISOString();
        historiar(e, p, nota || null);
        await salva();
        notifica();
      },
      async mensagens() { await exigeAdmin(); return clone((await est()).mensagens); },
      async marcarLida(id, lida) {
        await exigeAdmin();
        const m = (await est()).mensagens.find((x) => x.id === id);
        if (m) m.lida = lida;
        await salva();
      },
      async usuarios(): Promise<UsuarioAdmin[]> {
        await exigeAdmin();
        const e = await est();
        return e.usuarios.map((u) => {
          const meus = e.problemas.filter((p) => p.autor_id === u.id);
          return {
            id: u.id, nome: u.nome, criado_em: u.criado_em, suspenso: u.suspenso, problemas: meus.length,
            apoios: e.apoios.filter((a) => a.u === u.id).length,
            comentarios: e.comentarios.filter((c) => c.autor_id === u.id).length,
            denuncias_feitas: e.denuncias.filter((d) => d.u === u.id).length,
            denuncias_recebidas: meus.reduce((s, p) => s + p.denuncias_total, 0),
          };
        });
      },
      async suspender(id, suspenso) {
        const a = await exigeAdmin();
        if (a.id === id) throw new ErroRegra('Você não pode suspender a própria conta.');
        const u = (await est()).usuarios.find((x) => x.id === id);
        if (u) u.suspenso = suspenso;
        await salva();
      },
      async salvarRegras(r) {
        await exigeAdmin();
        (await est()).regras = r;
        await salva();
        notifica();
      },
      async salvarPatrocinios(lista) {
        await exigeAdmin();
        (await est()).patrocinios = lista.map((p, i) => ({ ...p, ordem: i }));
        await salva();
        notifica();
      },
      async acessos(dias): Promise<PainelAcessos> {
        await exigeAdmin();
        const de = Date.now() - dias * 86400000;
        const vs = (await est()).visitas.filter((v) => new Date(v.em).getTime() >= de);
        const conta = (f: (v: Estado['visitas'][number]) => string[]) => {
          const o: Record<string, number> = {};
          vs.forEach((v) => f(v).forEach((k) => { o[k] = (o[k] || 0) + 1; }));
          return o;
        };
        const dias_ = conta((v) => [v.em.slice(0, 10)]);
        return {
          visitas: vs.length,
          pessoas: new Set(vs.map((v) => v.v)).size,
          por_dia: Object.entries(dias_).sort().map(([dia, visitas]) => ({ dia, visitas, pessoas: visitas })),
          dispositivos: conta((v) => [v.d]),
          origens: Object.entries(conta((v) => [v.o])).map(([origem, visitas]) => ({ origem, visitas })),
          paginas: conta((v) => v.pg),
        };
      },
      async mfaEstado() { return { nivel: 'aal1', fatores: [] }; },
      async mfaCadastrar() { throw new ErroRegra('A verificação em duas etapas só existe com o Supabase ligado.'); },
      async mfaConfirmar() { /* sem efeito no modo de teste */ },
    },
  };
}

export async function restaurarDadosDeTeste() {
  await idbApagar(CHAVE);
  location.reload();
}
