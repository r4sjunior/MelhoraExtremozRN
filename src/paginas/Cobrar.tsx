import { useEffect, useState } from 'react';
import { CAMARA, CANAIS_PREFEITURA, PREFEITURA, SECRETARIAS, VEREADORES } from '../dados/contatos';
import { useApp } from '../estado/App';
import { navegar } from '../lib/rota';
import { copiar, enderecoCurto, mensagemCobranca } from '../lib/texto';
import { EspacoPatrocinio } from '../ui/Comum';

function BotaoCopiar({ texto, rotulo = 'Copiar', classe = 'copiar' }: { texto: string; rotulo?: string; classe?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className={classe} aria-label={`Copiar ${texto.slice(0, 40)}`} onClick={async () => { if (await copiar(texto)) { setOk(true); setTimeout(() => setOk(false), 1500); } }}>
      {ok ? 'Copiado' : rotulo}
    </button>
  );
}

export default function Cobrar() {
  const { problemas } = useApp();
  const pid = new URLSearchParams(location.search).get('p');
  const p = pid ? problemas.find((x) => x.id === pid) : null;
  const [msg, setMsg] = useState('');
  useEffect(() => { if (p) setMsg(mensagemCobranca(p)); }, [p?.id, p?.apoios, p?.protocolo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="pagina"><div className="largura">
      <header className="cabeca">
        <div>
          <p className="rotulo">Cobrar</p>
          <h1>Leve o problema a quem pode resolver</h1>
          <p className="suave">A Prefeitura executa os serviços e a Câmara fiscaliza. Registre o pedido nos canais oficiais, guarde o protocolo e informe aqui no problema: assim todo mundo acompanha.</p>
        </div>
      </header>

      {p ? (
        <div className="cobranca">
          <div className="linha entre">
            <div><p className="rotulo">Mensagem pronta</p><b>{p.titulo} · {enderecoCurto(p)}</b></div>
            <button type="button" className="btn peq claro" onClick={() => navegar('/cobrar')}>Fechar</button>
          </div>
          <textarea aria-label="Mensagem de cobrança" value={msg} onChange={(e) => setMsg(e.target.value)} style={{ minHeight: 210 }} />
          <div className="linha">
            <BotaoCopiar texto={msg} rotulo="Copiar mensagem" classe="btn peq" />
            <a className="btn peq claro" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a>
            <a className="btn peq claro" href={CANAIS_PREFEITURA[0].url} target="_blank" rel="noopener noreferrer">Abrir a Ouvidoria</a>
          </div>
        </div>
      ) : (
        <div className="destaque">Dica: abra um problema no mapa e toque em <b>Cobrar quem resolve</b>. A mensagem chega pronta, com endereço, apoios e link.</div>
      )}

      <section className="bloco">
        <p className="rotulo">Prefeitura de Extremoz · prefeita {PREFEITURA.gestora}, vice {PREFEITURA.vice}</p>
        <h2>Fale com a Prefeitura</h2>
        <div className="grade-canais">
          {CANAIS_PREFEITURA.map((c) => <a key={c.url} className="canal" href={c.url} target="_blank" rel="noopener noreferrer"><b>{c.nome}</b><span>{c.desc}</span></a>)}
        </div>
        <dl className="dados">
          <div><dt>Telefone</dt><dd><a href="tel:+558432794910">{PREFEITURA.telefone}</a> <BotaoCopiar texto={PREFEITURA.telefone} /><small>{PREFEITURA.horario}</small></dd></div>
          <div><dt>E-mail</dt><dd>{PREFEITURA.email} <BotaoCopiar texto={PREFEITURA.email} /></dd></div>
          <div><dt>Endereço</dt><dd>{PREFEITURA.endereco}</dd></div>
          <div><dt>Redes</dt><dd><a href={PREFEITURA.instagram} target="_blank" rel="noopener noreferrer">Instagram</a> · <a href={PREFEITURA.facebook} target="_blank" rel="noopener noreferrer">Facebook</a> · <a href={PREFEITURA.site} target="_blank" rel="noopener noreferrer">Site</a></dd></div>
        </dl>
        <h3>Secretarias mais ligadas aos problemas do mapa</h3>
        <div className="grade-canais">
          {SECRETARIAS.map((c) => <a key={c.url} className="canal" href={c.url} target="_blank" rel="noopener noreferrer"><b>{c.nome}</b><span>{c.desc}</span></a>)}
        </div>
      </section>

      <section className="bloco">
        <p className="rotulo">Câmara Municipal de Extremoz · presidente {CAMARA.presidente}</p>
        <h2>Fale com a Câmara</h2>
        <dl className="dados">
          <div><dt>Telefone</dt><dd><a href="tel:+558432792351">{CAMARA.telefone}</a> <BotaoCopiar texto={CAMARA.telefone} /></dd></div>
          <div><dt>E-mail</dt><dd>{CAMARA.email} <BotaoCopiar texto={CAMARA.email} /></dd></div>
          <div><dt>Endereço</dt><dd>{CAMARA.endereco}</dd></div>
        </dl>
        <h3>Vereadores eleitos em 2024 · {VEREADORES.length}</h3>
        <ul className="vereadores">
          {VEREADORES.map(([n, p2]) => <li key={n}><b>{n}</b><span>{p2}</span></li>)}
        </ul>
        <p className="suave">Eleitos segundo os dados abertos do TSE, com o partido da eleição. Pode ter havido troca de partido ou de suplente. Contatos individuais ainda não publicados: procure o gabinete pela Câmara.</p>
      </section>
      <p className="suave">O Melhora Extremoz é independente e não é canal oficial. Contatos conferidos em novembro de 2026; confirme nos sites oficiais se algo não funcionar.</p>
      <EspacoPatrocinio espaco="cobrar" />
    </div></section>
  );
}
