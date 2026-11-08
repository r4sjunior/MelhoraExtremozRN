import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { CadastroMfa, Comentario, Patrocinio, Problema, Regras, Sessao } from '../types';
import { REGRAS_PADRAO } from '../dados/constantes';
import { ErroRegra, type Backend } from './tipos';

/** Traduz o erro do banco: regras (P0001) chegam com texto pronto para o usuário. */
function checa(erro: { message?: string; code?: string } | null) {
  if (!erro) return;
  if (erro.code === 'P0001') throw new ErroRegra(erro.message || 'Operação não permitida.');
  throw new Error(erro.message || 'erro');
}

const COLUNAS_PROBLEMA = 'id,autor_id,categoria,titulo,descricao,via,numero,referencia,localidade,zona,lat,lon,fotos,status,protocolo,apoios,comentarios,denuncias_pendentes,graves_pendentes,denuncias_total,criado_em,atualizado_em,autor:perfis(nome)';

function mapaProblema(l: any): Problema {
  const { autor, ...resto } = l;
  return { ...resto, autor_nome: autor?.nome || 'Morador(a)' };
}

export function criarBackendSupabase(url: string, chave: string, captchaSiteKey: string): Backend {
  const sb: SupabaseClient = createClient(url, chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  let uid: string | null = null;

  async function sessaoAtual() {
    const { data } = await sb.auth.getSession();
    uid = data.session?.user.id ?? null;
    return data.session;
  }
  async function exigeUsuario(): Promise<string> {
    await sessaoAtual();
    if (!uid) throw new ErroRegra('Entre na sua conta para continuar.');
    return uid;
  }

  const redireciona = () => location.origin + location.pathname;

  return {
    modo: 'supabase',
    captchaSiteKey,

    async sessao(): Promise<Sessao | null> {
      const s = await sessaoAtual();
      if (!s) return null;
      const [perfil, adm, susp] = await Promise.all([
        sb.from('perfis').select('nome,nome_escolhido').eq('id', s.user.id).maybeSingle(),
        sb.from('admins').select('user_id').eq('user_id', s.user.id).maybeSingle(),
        sb.from('suspensoes').select('user_id').eq('user_id', s.user.id).maybeSingle(),
      ]);
      const adminCadastrado = !!adm.data;
      let isAdmin = false;
      if (adminCadastrado) {
        const r = await sb.rpc('is_admin');
        isAdmin = !r.error && r.data === true;
      }
      const m = s.user.user_metadata || {};
      return {
        id: s.user.id,
        email: s.user.email || '',
        nome: perfil.data?.nome_escolhido ? perfil.data.nome : (m.full_name || m.name || perfil.data?.nome || 'Morador(a)'),
        nomeEscolhido: !!perfil.data?.nome_escolhido,
        adminCadastrado,
        isAdmin,
        suspenso: !!susp.data,
      };
    },

    aoMudarSessao(cb) {
      let anterior: string | null | undefined;
      sb.auth.getSession().then(({ data }) => { anterior = data.session?.user.id ?? null; });
      sb.auth.onAuthStateChange((_ev, s) => {
        const atual = s?.user.id ?? null;
        // O Supabase avisa SIGNED_IN também ao renovar a sessão: só reagimos à troca real de pessoa.
        if (anterior === undefined || atual === anterior) return;
        anterior = atual;
        setTimeout(cb, 0);
      });
    },

    async entrarGoogle() {
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redireciona() } });
      checa(error);
    },
    async entrarEmail(email, captcha) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redireciona(), captchaToken: captcha } });
      checa(error);
    },
    async sair() {
      await sb.auth.signOut();
    },
    async excluirConta() {
      const id = await exigeUsuario();
      const pasta = sb.storage.from('fotos');
      for (let i = 0; i < 20; i++) {
        const l = await pasta.list(id, { limit: 100 });
        if (l.error || !l.data?.length) break;
        const r = await pasta.remove(l.data.map((f) => `${id}/${f.name}`));
        if (r.error) break;
      }
      const { error } = await sb.rpc('excluir_minha_conta');
      checa(error);
      await sb.auth.signOut({ scope: 'local' }).catch(() => {});
    },
    async mudarNome(nome) {
      const id = await exigeUsuario();
      const { error } = await sb.from('perfis').update({ nome, nome_escolhido: true }).eq('id', id);
      checa(error);
    },

    async regras(): Promise<Regras> {
      const { data } = await sb.from('regras').select('publicacoes_por_janela,janela_horas,denuncias_ocultar,idade_minima_denuncia_horas').eq('id', 1).maybeSingle();
      return data || REGRAS_PADRAO;
    },
    async problemas() {
      const lista: Problema[] = [];
      const pagina = 1000;
      for (let de = 0; de < 20000; de += pagina) {
        const { data, error } = await sb.from('problemas').select(COLUNAS_PROBLEMA).order('criado_em', { ascending: false }).range(de, de + pagina - 1);
        if (error) throw error;
        lista.push(...(data || []).map(mapaProblema));
        if (!data || data.length < pagina) break;
      }
      return lista;
    },
    assinarProblemas(cb) {
      let t: ReturnType<typeof setTimeout> | undefined;
      const canal: RealtimeChannel = sb.channel('problemas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'problemas' }, () => {
          clearTimeout(t);
          t = setTimeout(cb, 1200);
        })
        .subscribe();
      return () => { clearTimeout(t); sb.removeChannel(canal); };
    },
    async publicar(p) {
      const autor_id = await exigeUsuario();
      const { error } = await sb.from('problemas').insert({ ...p, autor_id });
      // Reenvio depois de queda de rede: o id é gerado no aparelho, então duplicata significa que já foi.
      if (error?.code === '23505') return;
      checa(error);
    },
    async excluirProblema(p) {
      const { error } = await sb.from('problemas').delete().eq('id', p.id);
      checa(error);
      if (p.fotos.length) await sb.storage.from('fotos').remove(p.fotos).catch(() => {});
    },
    async minhasPublicacoesRecentes() {
      // publicacoes_log é privado; a tela usa os problemas da pessoa. O limite exato vale no servidor.
      if (!uid) await sessaoAtual();
      if (!uid) return [];
      const { data } = await sb.from('problemas').select('criado_em').eq('autor_id', uid).order('criado_em', { ascending: false }).limit(50);
      return (data || []).map((d) => new Date(d.criado_em).getTime());
    },

    async meusApoios() {
      if (!uid) return [];
      const { data } = await sb.from('apoios').select('problema_id').eq('user_id', uid);
      return (data || []).map((d) => d.problema_id);
    },
    async apoiar(id, ligado) {
      const user_id = await exigeUsuario();
      const { error } = ligado
        ? await sb.from('apoios').insert({ problema_id: id, user_id })
        : await sb.from('apoios').delete().eq('problema_id', id).eq('user_id', user_id);
      if (error?.code === '23505') return;
      checa(error);
    },
    async minhasDenuncias() {
      if (!uid) return [];
      const { data } = await sb.from('denuncias').select('problema_id').eq('user_id', uid);
      return (data || []).map((d) => d.problema_id);
    },
    async denunciar(id, motivo) {
      const user_id = await exigeUsuario();
      const { error } = await sb.from('denuncias').insert({ problema_id: id, user_id, motivo });
      if (error?.code === '23505') return;
      checa(error);
    },

    async comentarios(id) {
      const { data, error } = await sb.from('comentarios').select('id,problema_id,autor_id,texto,em,autor:perfis(nome)').eq('problema_id', id).order('em');
      if (error) throw error;
      return (data || []).map((l: any): Comentario => ({ id: l.id, problema_id: l.problema_id, autor_id: l.autor_id, texto: l.texto, em: l.em, autor_nome: l.autor?.nome || 'Morador(a)' }));
    },
    async comentar(id, texto) {
      const autor_id = await exigeUsuario();
      const { error } = await sb.from('comentarios').insert({ problema_id: id, autor_id, texto });
      checa(error);
    },
    async excluirComentario(id) {
      const { error } = await sb.from('comentarios').delete().eq('id', id);
      checa(error);
    },
    async historico(id) {
      const { data, error } = await sb.from('historico_status').select('id,status,protocolo,nota,em').eq('problema_id', id).order('id');
      if (error) throw error;
      return data || [];
    },
    async definirProtocolo(id, protocolo) {
      const { error } = await sb.rpc('definir_protocolo', { p_id: id, p_protocolo: protocolo });
      checa(error);
    },

    async enviarFoto(blob) {
      const id = await exigeUsuario();
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '') || 'jpg';
      const caminho = `${id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from('fotos').upload(caminho, blob, { contentType: blob.type || 'image/jpeg', upsert: false, cacheControl: '31536000' });
      if (error) throw error;
      return caminho;
    },
    urlFoto(caminho) {
      return /^[0-9a-f-]{36}\/[a-z0-9-]{6,60}\.(jpg|png|webp|gif)$/.test(caminho) ? sb.storage.from('fotos').getPublicUrl(caminho).data.publicUrl : '';
    },
    async apagarFotos(caminhos) {
      if (caminhos.length) await sb.storage.from('fotos').remove(caminhos);
    },

    async patrocinios() {
      const { data } = await sb.from('patrocinios').select('*').order('ordem');
      return (data || []) as Patrocinio[];
    },
    async enviarMensagem(email, assunto, texto) {
      const { error } = await sb.rpc('enviar_mensagem', { p_email: email, p_assunto: assunto, p_texto: texto });
      checa(error);
    },
    async registrarVisita(sessao, visitante, pagina, dispositivo, origem) {
      await sb.rpc('registrar_visita', { p_sessao: sessao, p_visitante: visitante, p_pagina: pagina, p_dispositivo: dispositivo, p_origem: origem });
    },

    admin: {
      async denuncias() {
        const { data, error } = await sb.from('denuncias').select('problema_id,motivo,grave,revisada').eq('revisada', false);
        if (error) throw error;
        return data || [];
      },
      async moderar(id, acao) {
        // As fotos saem do Storage antes que o banco apague a lista delas.
        if (acao === 'remover') {
          const { data } = await sb.from('problemas').select('fotos').eq('id', id).maybeSingle();
          if (data?.fotos?.length) await sb.storage.from('fotos').remove(data.fotos).catch(() => {});
        }
        const { error } = await sb.rpc('moderar_problema', { p_id: id, p_acao: acao });
        checa(error);
      },
      async mudarStatus(id, status, nota) {
        const { error } = await sb.rpc('mudar_status', { p_id: id, p_status: status, p_nota: nota || null });
        checa(error);
      },
      async mensagens() {
        const { data, error } = await sb.from('mensagens').select('id,email,assunto,texto,lida,em').order('em', { ascending: false }).limit(500);
        if (error) throw error;
        return data || [];
      },
      async marcarLida(id, lida) {
        const { error } = await sb.from('mensagens').update({ lida }).eq('id', id);
        checa(error);
      },
      async usuarios() {
        const { data, error } = await sb.rpc('admin_usuarios');
        checa(error);
        return data || [];
      },
      async suspender(id, suspenso) {
        const { error } = await sb.rpc('definir_suspensao', { p_user: id, p_suspenso: suspenso });
        checa(error);
      },
      async salvarRegras(r) {
        const { error } = await sb.from('regras').update({ ...r, atualizado_em: new Date().toISOString() }).eq('id', 1);
        checa(error);
      },
      async salvarPatrocinios(lista) {
        const { data: atuais, error: e1 } = await sb.from('patrocinios').select('id');
        checa(e1);
        const manter = new Set(lista.map((p) => p.id));
        const sair = (atuais || []).map((a) => a.id).filter((i) => !manter.has(i));
        if (sair.length) checa((await sb.from('patrocinios').delete().in('id', sair)).error);
        if (lista.length) checa((await sb.from('patrocinios').upsert(lista.map((p, i) => ({ ...p, ordem: i })))).error);
      },
      async acessos(dias) {
        const { data, error } = await sb.rpc('painel_acessos', { p_dias: dias });
        checa(error);
        return data;
      },
      async mfaEstado() {
        const a = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        const f = await sb.auth.mfa.listFactors();
        return { nivel: a.data?.currentLevel || 'aal1', fatores: (f.data?.totp || []).filter((x) => x.status === 'verified').map((x) => ({ id: x.id })) };
      },
      async mfaCadastrar(): Promise<CadastroMfa> {
        const f = await sb.auth.mfa.listFactors();
        for (const x of f.data?.all || []) if (x.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: x.id });
        const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Melhora Extremoz ${new Date().toISOString().slice(0, 10)}` });
        if (error) throw error;
        return { id: data.id, qr: data.totp.qr_code, segredo: data.totp.secret };
      },
      async mfaConfirmar(id, codigo) {
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: id, code: codigo.replace(/\D/g, '') });
        if (error) throw error;
      },
    },
  };
}
