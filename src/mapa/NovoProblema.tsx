import { useEffect, useMemo, useRef, useState } from 'react';
import { backend } from '../backend';
import { ErroRegra } from '../backend/tipos';
import { CATEGORIAS, MAX_FOTOS, RAIO_DUPLICADO_M } from '../dados/constantes';
import { problemasVisiveis, useApp } from '../estado/App';
import { aceitaFoto, prepararFoto } from '../lib/fotos';
import { distanciaM, pontoDoNumero } from '../lib/geo';
import { esperaTxt, limiteTxt } from '../lib/texto';
import type { ZonaId } from '../types';
import { ItemProblema } from '../ui/Comum';

export interface RascunhoFoto { blob?: Blob; caminho?: string; url: string }
export interface Rascunho {
  id: string; lat: number; lon: number; via: string; numero: string; semNumero: boolean; localidade: string; zona: ZonaId; semEndereco: boolean; ruaIdx: number;
  categoria: string; titulo: string; descricao: string; referencia: string; fotos: RascunhoFoto[]; pendente: boolean;
}

interface Props {
  rascunho: Rascunho;
  setRascunho(f: Rascunho | null | ((r: Rascunho | null) => Rascunho | null)): void;
  aoTerminar(id?: string): void;
  aoMoverPara(lon: number, lat: number): void;
  aoAbrirExistente(id: string): void;
}

const ehRede = (e: unknown) => !navigator.onLine || /fetch|network|load failed|timed? ?out|offline|abort/i.test(String((e as Error)?.message || e));

export function NovoProblemaForm({ rascunho: d, setRascunho, aoTerminar, aoMoverPara, aoAbrirExistente }: Props) {
  const { geo, problemas, regras, sessao, aviso, avisoErro, abrirModal, recarregar } = useApp();
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const arquivo = useRef<HTMLInputElement>(null);
  const atual = useRef(d);
  atual.current = d;

  const muda = (c: Partial<Rascunho>) => setRascunho((r) => (r ? { ...r, ...c } : r));

  // Tempo até poder publicar de novo (o servidor confere de verdade).
  useEffect(() => {
    if (!sessao) { setEspera(0); return; }
    let vivo = true;
    const calc = async () => {
      const t = await backend.minhasPublicacoesRecentes();
      const j = regras.janela_horas * 3600000;
      const rec = t.filter((x) => Date.now() - x < j).sort((a, b) => b - a);
      if (vivo) setEspera(rec.length >= regras.publicacoes_por_janela ? Math.max(1, rec[regras.publicacoes_por_janela - 1] + j - Date.now()) : 0);
    };
    calc();
    const i = setInterval(calc, 60000);
    return () => { vivo = false; clearInterval(i); };
  }, [sessao, regras]);

  const perto = useMemo(() => problemasVisiveis(problemas)
    .map((p) => ({ p, m: distanciaM(d.lat, d.lon, p.lat, p.lon) }))
    .filter((x) => x.m <= RAIO_DUPLICADO_M)
    .sort((a, b) => a.m - b.m), [problemas, d.lat, d.lon]);

  async function adicionarFotos(lista: FileList | null) {
    if (!lista) return;
    const vagas = MAX_FOTOS - d.fotos.length;
    const arqs = [...lista].filter(aceitaFoto).slice(0, vagas);
    if (lista.length > vagas) aviso(`Máximo de ${MAX_FOTOS} fotos por problema.`);
    for (const f of arqs) {
      try {
        aviso('Preparando foto…');
        const blob = await prepararFoto(f);
        setRascunho((r) => (r ? { ...r, fotos: [...r.fotos, { blob, url: URL.createObjectURL(blob) }] } : r));
      } catch {
        aviso('Não conseguimos abrir essa foto. Tente uma em JPG ou PNG.');
      }
    }
  }

  function localizarNumero() {
    if (!geo || d.ruaIdx < 0) return;
    const n = parseInt(d.numero, 10);
    if (Number.isNaN(n)) { aviso('Digite o número do imóvel.'); return; }
    const pt = pontoDoNumero(geo.ruas[d.ruaIdx], n);
    if (!pt) { aviso('Esta via não tem numeração cadastrada. Ajuste o alfinete no mapa.'); return; }
    muda({ lat: pt.lat, lon: pt.lon });
    aoMoverPara(pt.lon, pt.lat);
    if (pt.fora) aviso('Número fora do trecho cadastrado. Levamos o alfinete para o ponto mais próximo: ajuste no mapa.');
  }

  function validar(r: Rascunho): string | null {
    if (!r.categoria) return 'Escolha o tipo de problema.';
    if (r.titulo.trim().length < 4) return 'Dê um título ao problema (4 a 40 caracteres).';
    if (r.descricao.trim().length < 15) return 'Descreva o problema com pelo menos 15 caracteres.';
    if (!r.semEndereco && !r.semNumero && !r.numero.trim()) return 'Informe o número do imóvel ou marque "Sem número".';
    if (r.semEndereco && r.referencia.trim().length < 5) return 'Sem endereço cadastrado, conte um ponto de referência.';
    return null;
  }

  async function publicar(automatico = false) {
    const r = atual.current;
    if (enviando) return;
    const inval = validar(r);
    if (inval) { if (!automatico) aviso(inval); return; }
    if (!sessao) { aviso('Entre na sua conta para publicar. O que você preencheu fica guardado.'); abrirModal('login'); return; }
    if (sessao.suspenso) { aviso('Sua conta está suspensa e não pode publicar.'); return; }
    if (espera > 0) { aviso(`Limite atingido: ${limiteTxt(regras.publicacoes_por_janela, regras.janela_horas)}.`); return; }
    if (!navigator.onLine) {
      muda({ pendente: true });
      if (!automatico) aviso('Sem internet agora. Guardamos seu problema: ele será enviado quando a conexão voltar.');
      return;
    }
    setEnviando(true);
    try {
      const fotos = [...r.fotos];
      for (let i = 0; i < fotos.length; i++) {
        if (fotos[i].caminho) continue;
        aviso('Enviando foto…');
        const caminho = await backend.enviarFoto(fotos[i].blob!);
        fotos[i] = { ...fotos[i], caminho };
        // Guarda a cada foto enviada para não repetir o envio se a internet cair.
        setRascunho((x) => (x ? { ...x, fotos: [...fotos] } : x));
      }
      await backend.publicar({
        id: r.id, categoria: r.categoria, titulo: r.titulo.trim().slice(0, 40), descricao: r.descricao.trim().slice(0, 1200), via: r.via,
        numero: r.semEndereco || r.semNumero ? null : r.numero.trim().slice(0, 8), referencia: r.referencia.trim().slice(0, 80) || null,
        localidade: r.localidade, zona: r.zona, lat: +r.lat.toFixed(6), lon: +r.lon.toFixed(6), fotos: fotos.map((f) => f.caminho!),
      });
      await recarregar();
      fotos.forEach((f) => { if (f.url.startsWith('blob:')) URL.revokeObjectURL(f.url); });
      aviso(r.pendente ? 'Pronto: seu problema foi enviado e já aparece no mapa.' : 'Problema publicado. Ele já aparece no mapa.');
      aoTerminar(r.id);
    } catch (e) {
      if (!(e instanceof ErroRegra) && ehRede(e)) {
        muda({ pendente: true });
        if (!automatico) aviso('A internet caiu. Guardamos seu problema: ele será enviado quando a conexão voltar.');
      } else if (!automatico) avisoErro(e, 'Não foi possível publicar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  // Reenvio automático quando a conexão volta, com o app aberto.
  const tentar = useRef(publicar);
  tentar.current = publicar;
  useEffect(() => {
    if (!d.pendente) return;
    const vai = () => { if (navigator.onLine && !document.hidden) tentar.current(true); };
    const i = setInterval(vai, 20000);
    window.addEventListener('online', vai);
    return () => { clearInterval(i); window.removeEventListener('online', vai); };
  }, [d.pendente]);

  return (
    <>
      <div className="linha entre">
        <h2>Novo problema</h2>
        <button type="button" className="btn peq claro" onClick={() => aoTerminar()}>Cancelar</button>
      </div>
      <div className="endereco"><b>{d.via}{d.numero && !d.semNumero ? `, ${d.numero}` : ''}</b> · {d.localidade}</div>

      {perto.length > 0 && (
        <>
          <div className="destaque"><b>Antes de publicar:</b> {perto.length > 1 ? `já existem ${perto.length} problemas` : 'já existe 1 problema'} a até {RAIO_DUPLICADO_M} m daqui. Se for o mesmo, abra e apoie.</div>
          <div className="lista">{perto.slice(0, 4).map(({ p }) => <ItemProblema key={p.id} p={p} aoAbrir={() => aoAbrirExistente(p.id)} />)}</div>
        </>
      )}
      {espera > 0 && <div className="destaque alerta">Cada pessoa pode publicar {limiteTxt(regras.publicacoes_por_janela, regras.janela_horas)}. Você poderá publicar de novo em <b>{esperaTxt(espera)}</b>. Enquanto isso, apoie e comente.</div>}

      {d.semEndereco ? (
        <div className="destaque"><b>Este ponto não tem endereço no cadastro do IBGE.</b> Tudo bem: o ponto do mapa vale. Conte uma referência abaixo.</div>
      ) : (
        <div>
          <label className="rotulo" htmlFor="dNum">1 · Número do imóvel mais próximo</label>
          <div className="linha">
            <input id="dNum" type="number" inputMode="numeric" min={0} disabled={d.semNumero} value={d.semNumero ? '' : d.numero} placeholder={d.semNumero ? 'Sem número' : 'Ex.: 139'} onChange={(e) => muda({ numero: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') localizarNumero(); }} style={{ flex: 1, minWidth: 0 }} />
            <button type="button" className="btn claro" disabled={d.semNumero} onClick={localizarNumero}>Localizar</button>
          </div>
          <label className="marcar"><input type="checkbox" checked={d.semNumero} onChange={(e) => muda({ semNumero: e.target.checked })} /> Sem número</label>
        </div>
      )}

      <div>
        <label className="rotulo" htmlFor="dRef">{d.semEndereco ? '1 · Ponto de referência' : 'Ponto de referência (opcional)'}</label>
        <input id="dRef" type="text" maxLength={80} value={d.referencia} placeholder="Ex.: em frente à escola, perto da lagoa" onChange={(e) => muda({ referencia: e.target.value })} />
      </div>

      <div>
        <p className="rotulo">2 · Tipo de problema</p>
        <div className="chips">
          {CATEGORIAS.map(([k, v]) => <button type="button" key={k} aria-pressed={d.categoria === k} onClick={() => muda({ categoria: k })}>{v}</button>)}
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="dTit">3 · Título</label>
        <input id="dTit" type="text" maxLength={40} value={d.titulo} placeholder="Ex.: Rua escura à noite" onChange={(e) => muda({ titulo: e.target.value })} />
        <div className="contador">{d.titulo.length}/40</div>
      </div>

      <div>
        <label className="rotulo" htmlFor="dDesc">4 · O que está acontecendo?</label>
        <textarea id="dDesc" maxLength={1200} value={d.descricao} placeholder="Ex.: Buraco grande na faixa da direita, em frente ao portão. Já tem uns 2 meses." onChange={(e) => muda({ descricao: e.target.value })} />
        <div className="contador">{d.descricao.length}/1200</div>
      </div>

      <div>
        <p className="rotulo">5 · Fotos (até {MAX_FOTOS})</p>
        <div className="fotos-novas">
          {[0, 1, 2].map((i) => d.fotos[i] ? (
            <div className="foto-nova" key={i} style={{ backgroundImage: `url("${d.fotos[i].url || backend.urlFoto(d.fotos[i].caminho || '')}")` }}>
              <button type="button" aria-label="Remover foto" onClick={() => setRascunho((r) => (r ? { ...r, fotos: r.fotos.filter((_, k) => k !== i) } : r))}>×</button>
            </div>
          ) : (
            <button type="button" className="foto-nova vaga" key={i} onClick={() => { if (arquivo.current) { arquivo.current.value = ''; arquivo.current.click(); } }}>+ foto</button>
          ))}
        </div>
        <small className="suave">Não mostre rostos, placas de carro ou dados de outras pessoas.</small>
        <input ref={arquivo} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => adicionarFotos(e.target.files)} />
      </div>

      {d.pendente && (
        <div className="destaque alerta"><b>Esperando internet.</b> Seu problema está guardado neste aparelho e será enviado quando a conexão voltar. Deixe o app aberto.</div>
      )}
      <button type="button" className="btn" disabled={enviando || espera > 0} onClick={() => publicar()}>
        {enviando ? 'Enviando…' : d.pendente ? 'Enviar agora' : sessao ? 'Publicar problema' : 'Entrar e publicar'}
      </button>
      <small className="suave">Ao publicar, seu apoio já conta como o primeiro. Com {regras.denuncias_ocultar} denúncias, a publicação sai do mapa até a revisão.</small>
    </>
  );
}
