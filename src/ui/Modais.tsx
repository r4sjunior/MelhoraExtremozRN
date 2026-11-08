import { useEffect, useRef, useState, type FormEvent } from 'react';
import { backend } from '../backend';
import { ASSUNTOS, NOME_APP, VERSAO_TERMOS } from '../dados/constantes';
import { useApp } from '../estado/App';
import { gravarLocal, lerLocal } from '../lib/idb';
import { navegar } from '../lib/rota';
import { emailValido, limiteTxt, nomeValido } from '../lib/texto';
import { Logo, Modal } from './Comum';

function Intro() {
  const { abrirModal } = useApp();
  const fechar = () => { gravarLocal('me_intro', '1'); abrirModal(null); };
  return (
    <Modal aoFechar={fechar} rotulo="Boas-vindas">
      <Logo tamanho={56} />
      <h2>Extremoz inteira olhando para o mesmo mapa</h2>
      <p>Buraco, poste apagado, entulho, rua alagada, areia na pista: aqui o que você vê todo dia vira um ponto no mapa que a vizinhança inteira pode apoiar e cobrar.</p>
      <ol className="passos-intro">
        <li><b>Marque</b> o problema no ponto exato, com foto.</li>
        <li><b>Junte a vizinhança:</b> cada apoio deixa o ponto mais forte.</li>
        <li><b>Cobre</b> quem resolve e acompanhe até sair do papel.</li>
      </ol>
      <button type="button" className="btn" onClick={() => { gravarLocal('me_intro', '1'); abrirModal('tutorial'); }}>Como funciona?</button>
      <button type="button" className="btn claro" onClick={fechar}>Ver o mapa</button>
    </Modal>
  );
}

function Tutorial() {
  const { abrirModal, regras } = useApp();
  return (
    <Modal aoFechar={() => abrirModal(null)} rotulo="Como usar">
      <h2>Como usar</h2>
      <ol className="passos">
        <li><b>Encontre o lugar.</b> Busque rua, número ou bairro, use o GPS ou aproxime o mapa. Muitas vias de Extremoz não têm nome no cadastro: nesses casos, toque direto no ponto.</li>
        <li><b>Veja se já apontaram.</b> O app mostra o que existe por perto. Se for o mesmo problema, toque em <b>▲ Apoiar</b> e comente o que souber.</li>
        <li><b>Não achou? Aponte.</b> Toque no ponto do mapa e arraste o alfinete até o lugar certo. Sem endereço, conte uma referência.</li>
        <li><b>Conte o que é.</b> Tipo, título, descrição e até 3 fotos. Cada pessoa publica até {limiteTxt(regras.publicacoes_por_janela, regras.janela_horas)}.</li>
        <li><b>Cobre.</b> Toque em <b>Cobrar quem resolve</b>, envie a mensagem pronta e informe o protocolo no problema.</li>
      </ol>
      <p className="suave">Viu algo falso ou ofensivo? Use ⚑ Denunciar. Com {regras.denuncias_ocultar} denúncias, a publicação sai do mapa até a revisão.</p>
      <button type="button" className="btn" onClick={() => abrirModal(null)}>Entendi</button>
    </Modal>
  );
}

function Captcha({ aoToken }: { aoToken(t: string): void }) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!backend.captchaSiteKey) return;
    let vivo = true;
    const desenha = () => {
      const t = (window as any).turnstile;
      if (vivo && t && caixa.current) t.render(caixa.current, { sitekey: backend.captchaSiteKey, language: 'pt-br', size: 'flexible', callback: aoToken, 'expired-callback': () => aoToken('') });
    };
    if ((window as any).turnstile) desenha();
    else {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = desenha;
      document.head.appendChild(s);
    }
    return () => { vivo = false; };
  }, [aoToken]);
  return backend.captchaSiteKey ? <div ref={caixa} /> : null;
}

function Login() {
  const { abrirModal, aviso, avisoErro } = useApp();
  const [aceito, setAceito] = useState(() => lerLocal('me_termos') === VERSAO_TERMOS);
  const [erroAceite, setErroAceite] = useState(false);
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [nomeTeste, setNomeTeste] = useState('');
  const [adminTeste, setAdminTeste] = useState(false);

  const exige = () => { if (aceito) return true; setErroAceite(true); return false; };
  const marcar = (v: boolean) => { setAceito(v); if (v) { setErroAceite(false); gravarLocal('me_termos', VERSAO_TERMOS); } };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!exige()) return;
    const em = email.trim();
    if (!emailValido(em)) { setErro('Informe um e-mail válido.'); return; }
    if (backend.captchaSiteKey && !captcha) { setErro('Confirme que você não é um robô.'); return; }
    setOcupado(true);
    setErro('');
    try {
      await backend.entrarEmail(em, captcha || undefined);
      setEnviado(true);
    } catch (x) {
      console.error(x);
      setErro('Não foi possível enviar o link agora. Tente de novo em alguns minutos.');
    } finally {
      setOcupado(false);
    }
  }

  if (enviado) {
    return (
      <Modal aoFechar={() => abrirModal(null)} rotulo="Confira seu e-mail">
        <h2>Confira seu e-mail</h2>
        <p>Enviamos um link de acesso para <b>{email}</b>. Abra o link neste mesmo aparelho.</p>
        <div className="destaque">Não achou? Veja também o <b>spam</b> ou o lixo eletrônico. Ainda não chegou? Peça de novo em um minuto.</div>
        <button type="button" className="btn" onClick={() => abrirModal(null)}>Fechar</button>
      </Modal>
    );
  }

  return (
    <Modal aoFechar={() => abrirModal(null)} rotulo="Entrar">
      <h2>Entrar no {NOME_APP}</h2>
      <p className="suave">Para apontar, apoiar e comentar. Seu e-mail nunca aparece no site.</p>
      <label className="marcar aceite">
        <input type="checkbox" checked={aceito} onChange={(e) => marcar(e.target.checked)} />
        <span>Tenho 18 anos ou autorização do responsável, e concordo com os <a href="/termos" target="_blank" rel="noopener">Termos de uso</a> e a <a href="/privacidade" target="_blank" rel="noopener">Política de privacidade</a>.</span>
      </label>
      {erroAceite && <p className="destaque alerta">Para entrar, marque que concorda com os termos.</p>}
      {backend.modo === 'teste' ? (
        <form className="pilha" onSubmit={async (e) => {
          e.preventDefault();
          if (!exige()) return;
          try {
            await backend.entrarTeste!(nomeTeste.trim().replace(/\s+/g, ' '), adminTeste);
            abrirModal(null);
            aviso('Você entrou no modo de teste.');
          } catch (x) { avisoErro(x, 'Não foi possível entrar.'); }
        }}>
          <div className="destaque">Modo de teste: não há senha nem e-mail. Com o Supabase ligado, aqui aparecem Google e link por e-mail.</div>
          <label><span className="rotulo">Seu nome (opcional)</span><input type="text" maxLength={40} value={nomeTeste} onChange={(e) => setNomeTeste(e.target.value)} placeholder="Ex.: Ednilson" /></label>
          <label className="marcar"><input type="checkbox" checked={adminTeste} onChange={(e) => setAdminTeste(e.target.checked)} /> Entrar como administrador (para testar o painel)</label>
          <button type="submit" className="btn">Entrar para testar</button>
        </form>
      ) : (
        <>
          <button type="button" className="btn" onClick={() => { if (exige()) backend.entrarGoogle().catch(() => aviso('Não foi possível abrir o login do Google. Tente de novo.')); }}>Entrar com Google</button>
          <div className="ou">ou</div>
          <form className="pilha" noValidate onSubmit={enviar}>
            <label><span className="rotulo">Seu e-mail</span><input type="text" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" /></label>
            <Captcha aoToken={setCaptcha} />
            {erro && <p className="destaque alerta">{erro}</p>}
            <button type="submit" className="btn claro" disabled={ocupado}>Receber link de acesso por e-mail</button>
          </form>
        </>
      )}
    </Modal>
  );
}

function EscolherNome() {
  const { sessao, abrirModal, aviso, recarregarSessao, recarregar } = useApp();
  const [nome, setNome] = useState(sessao?.nome && sessao.nome !== 'Morador(a)' ? sessao.nome : '');
  const [erro, setErro] = useState('');
  const salvar = async (n: string) => {
    if (!nomeValido(n)) { setErro('Use de 2 a 40 letras, sem @, < ou >.'); return; }
    try {
      await backend.mudarNome(n);
      await recarregarSessao();
      await recarregar();
      abrirModal(null);
      aviso(n === 'Morador(a)' ? 'Pronto: seu nome não vai aparecer.' : 'Nome salvo.');
    } catch (e) { console.error(e); setErro('Não foi possível salvar agora. Tente de novo.'); }
  };
  return (
    <Modal rotulo="Como você quer aparecer?">
      <h2>Como você quer aparecer?</h2>
      <p>Esse nome aparece nas suas publicações e comentários. Seu e-mail nunca aparece.</p>
      <input type="text" aria-label="Seu nome ou apelido" maxLength={40} value={nome} placeholder="Seu nome ou apelido" autoComplete="nickname" onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') salvar(nome.trim().replace(/\s+/g, ' ')); }} />
      {erro && <p className="destaque alerta">{erro}</p>}
      <button type="button" className="btn" onClick={() => salvar(nome.trim().replace(/\s+/g, ' '))}>Usar este nome</button>
      <button type="button" className="btn claro" onClick={() => salvar('Morador(a)')}>Prefiro não mostrar meu nome</button>
      <p className="suave">Sem nome, você aparece como "Morador(a)". Dá para mudar depois em "Sua conta".</p>
    </Modal>
  );
}

function Conta() {
  const { sessao, abrirModal, aviso, avisoErro, problemas, recarregarSessao, recarregar } = useApp();
  const [nome, setNome] = useState(sessao?.nome || '');
  const [confirmar, setConfirmar] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  if (!sessao) return null;
  const meus = problemas.filter((p) => p.autor_id === sessao.id);
  return (
    <Modal aoFechar={() => abrirModal(null)} rotulo="Sua conta">
      <h2>Sua conta</h2>
      <p>Você entrou como <b>{sessao.email}</b>. Seu e-mail não aparece no site.</p>
      <div>
        <label className="rotulo" htmlFor="contaNome">Nome nas suas publicações</label>
        <div className="linha">
          <input id="contaNome" type="text" maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
          <button type="button" className="btn claro" onClick={async () => {
            const n = nome.trim().replace(/\s+/g, ' ');
            if (!nomeValido(n)) { aviso('Use de 2 a 40 letras, sem @, < ou >.'); return; }
            try { await backend.mudarNome(n); await recarregarSessao(); await recarregar(); aviso('Nome atualizado.'); } catch (e) { avisoErro(e, 'Não foi possível mudar o nome.'); }
          }}>Salvar</button>
        </div>
      </div>
      <p className="rotulo">Problemas que você publicou · {meus.length}</p>
      {meus.length ? (
        <div className="lista curta">{meus.map((p) => <button type="button" className="item-simples" key={p.id} onClick={() => { abrirModal(null); navegar(`/problema/${p.id}`); }}>{p.titulo}<small>{p.localidade}</small></button>)}</div>
      ) : <p className="suave">Você ainda não publicou nenhum problema.</p>}
      {sessao.isAdmin && <button type="button" className="btn claro" onClick={() => { abrirModal(null); navegar('/painel'); }}>Abrir o painel de administração</button>}
      <div className="linha">
        <button type="button" className="btn claro" onClick={async () => { await backend.sair(); abrirModal(null); await recarregarSessao(); await recarregar(); }}>Sair</button>
        <button type="button" className="btn" onClick={() => abrirModal(null)}>Fechar</button>
      </div>
      {confirmar ? (
        <div className="destaque alerta">
          <b>Excluir sua conta?</b> Isso apaga de vez seus problemas (com fotos), comentários, apoios e denúncias, além do seu nome e e-mail. Não pode ser desfeito.
          <div className="linha" style={{ marginTop: 8 }}>
            <button type="button" className="btn peq perigo" disabled={excluindo} onClick={async () => {
              setExcluindo(true);
              try {
                await backend.excluirConta();
                abrirModal(null);
                await recarregarSessao();
                await recarregar();
                aviso('Sua conta e tudo o que você publicou foram excluídos.');
              } catch (e) { setExcluindo(false); avisoErro(e, 'Não foi possível excluir agora. Tente de novo.'); }
            }}>{excluindo ? 'Excluindo…' : 'Excluir tudo'}</button>
            <button type="button" className="btn peq claro" onClick={() => setConfirmar(false)}>Cancelar</button>
          </div>
        </div>
      ) : <button type="button" className="link perigo-txt alinha-ini" onClick={() => setConfirmar(true)}>Excluir minha conta</button>}
    </Modal>
  );
}

function Contato({ assuntoInicial }: { assuntoInicial: string }) {
  const { abrirModal } = useApp();
  const [email, setEmail] = useState('');
  const [assunto, setAssunto] = useState(assuntoInicial);
  const [outro, setOutro] = useState('');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!emailValido(email.trim())) { setErro('Informe um e-mail válido para podermos responder.'); return; }
    if (!assunto) { setErro('Escolha um assunto.'); return; }
    if (assunto === 'Outro' && outro.trim().length < 3) { setErro('Escreva qual é o assunto.'); return; }
    if (msg.trim().length < 10) { setErro('Escreva a mensagem (pelo menos 10 caracteres).'); return; }
    setOcupado(true);
    setErro('');
    try {
      await backend.enviarMensagem(email.trim().slice(0, 200), assunto === 'Outro' ? `Outro: ${outro.trim().slice(0, 80)}` : assunto, msg.trim().slice(0, 2000));
      setOk(true);
    } catch (x: any) {
      setErro(x?.constructor?.name === 'ErroRegra' ? x.message : 'A mensagem não foi enviada. Tente de novo em instantes.');
    } finally {
      setOcupado(false);
    }
  }
  if (ok) {
    return (
      <Modal aoFechar={() => abrirModal(null)} rotulo="Mensagem enviada">
        <h2>Mensagem enviada</h2>
        <p>Obrigado pelo contato. Vamos responder em {email}.</p>
        <button type="button" className="btn" onClick={() => abrirModal(null)}>Fechar</button>
      </Modal>
    );
  }
  return (
    <Modal aoFechar={() => abrirModal(null)} rotulo="Fale com a gente">
      <h2>Fale com a gente</h2>
      <form className="pilha" noValidate onSubmit={enviar}>
        <label><span className="rotulo">Seu e-mail</span><input type="text" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" /></label>
        <label><span className="rotulo">Assunto</span>
          <select value={assunto} onChange={(e) => setAssunto(e.target.value)}><option value="">Escolha um assunto</option>{ASSUNTOS.map((a) => <option key={a}>{a}</option>)}</select>
        </label>
        {assunto === 'Outro' && <label><span className="rotulo">Qual assunto?</span><input type="text" maxLength={80} value={outro} onChange={(e) => setOutro(e.target.value)} /></label>}
        <label><span className="rotulo">Mensagem</span><textarea maxLength={2000} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Escreva sua mensagem" /></label>
        {erro && <p className="destaque alerta">{erro}</p>}
        <div className="linha">
          <button type="submit" className="btn" disabled={ocupado}>Enviar mensagem</button>
          <button type="button" className="btn claro" onClick={() => abrirModal(null)}>Cancelar</button>
        </div>
      </form>
    </Modal>
  );
}

function Instalar({ prompt, limpar }: { prompt: any; limpar(): void }) {
  const { abrirModal } = useApp();
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return (
    <Modal aoFechar={() => abrirModal(null)} rotulo="Instalar o app">
      <h2>Tenha o app no celular</h2>
      <p>Salve na tela inicial: abre em tela cheia, sem loja de aplicativos e quase sem ocupar espaço.</p>
      {prompt && <button type="button" className="btn" onClick={async () => { abrirModal(null); await prompt.prompt(); limpar(); }}>Instalar agora</button>}
      <ol className="passos">
        {ios ? (
          <>
            <li>No <b>Safari</b>, toque em <b>Compartilhar</b> (o quadrado com a seta).</li>
            <li>Toque em <b>Adicionar à Tela de Início</b>.</li>
            <li>Confirme em <b>Adicionar</b>.</li>
          </>
        ) : (
          <>
            <li>Toque no menu do navegador (⋮), no canto da tela.</li>
            <li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li>
            <li>Confirme.</li>
          </>
        )}
      </ol>
      <button type="button" className="btn claro" onClick={() => abrirModal(null)}>Fechar</button>
    </Modal>
  );
}

export function Modais({ promptInstalar, limparPrompt }: { promptInstalar: any; limparPrompt(): void }) {
  const { modal } = useApp();
  if (!modal) return null;
  if (typeof modal === 'object') return <Contato assuntoInicial={modal.contato} />;
  switch (modal) {
    case 'intro': return <Intro />;
    case 'tutorial': return <Tutorial />;
    case 'login': return <Login />;
    case 'conta': return <Conta />;
    case 'nome': return <EscolherNome />;
    case 'instalar': return <Instalar prompt={promptInstalar} limpar={limparPrompt} />;
  }
}
