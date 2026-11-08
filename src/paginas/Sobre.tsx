import { ZONAS } from '../dados/constantes';
import { useApp } from '../estado/App';
import { navegar } from '../lib/rota';
import { limiteTxt } from '../lib/texto';
import { EspacoPatrocinio, Logo } from '../ui/Comum';

export default function Sobre() {
  const { regras, abrirModal } = useApp();
  return (
    <section className="pagina"><div className="largura estreita">
      <header className="sobre-topo">
        <Logo tamanho={72} />
        <div>
          <p className="rotulo">Sobre o projeto</p>
          <h1>A cidade inteira olhando para o mesmo mapa</h1>
          <p>Da Sede a Pitangui, de Genipabu a Redinha Nova, de Estivas ao Interior: o Melhora Extremoz junta num lugar só o que os moradores veem todo dia e ainda não foi resolvido. Problema que muita gente enxerga é mais difícil de ignorar.</p>
        </div>
      </header>

      <div className="tres">
        <article><span className="numero">1</span><h3>Marcar</h3><p>Em vez de sumir num grupo de WhatsApp, o problema vira um ponto no mapa, com foto, endereço e data.</p></article>
        <article><span className="numero">2</span><h3>Juntar a vizinhança</h3><p>Cada apoio deixa o ponto mais forte e sobe o problema na lista de prioridades do bairro e da cidade.</p></article>
        <article><span className="numero">3</span><h3>Cobrar e acompanhar</h3><p>Com mensagem pronta, protocolo e histórico público, dá para saber há quantos dias o problema espera solução.</p></article>
      </div>

      <section className="bloco">
        <h2>Como mantemos o mapa confiável</h2>
        <ul className="regras">
          <li><b>Até {limiteTxt(regras.publicacoes_por_janela, regras.janela_horas)} por pessoa.</b> Apoios não têm limite.</li>
          <li><b>Apoie em vez de repetir.</b> Antes de publicar, o app mostra o que já foi apontado a até 80 m.</li>
          <li><b>A comunidade modera.</b> Com {regras.denuncias_ocultar} denúncias, a publicação sai do mapa até a revisão. Denúncia de conteúdo grave retira na hora.</li>
          <li><b>Independente.</b> Não é canal oficial da Prefeitura nem da Câmara. Para o pedido formal, use também a <button type="button" className="link" onClick={() => navegar('/cobrar')}>Ouvidoria e os outros canais</button>.</li>
        </ul>
      </section>

      <section className="bloco">
        <h2>De onde vêm os dados do mapa</h2>
        <ul className="regras">
          <li><b>Endereços:</b> Cadastro Nacional de Endereços (CNEFE), IBGE, Censo 2022. Só usamos via, número, localidade e coordenada.</li>
          <li><b>Áreas do mapa:</b> setores censitários do IBGE, agrupados por nós. As zonas ({ZONAS.map((z) => z[1]).join(', ')}) foram propostas pelo projeto e não são divisão oficial do município.</li>
          <li><b>Referências de bairro e mapa-base:</b> © colaboradores do <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>, licença ODbL, com desenho do OpenFreeMap e OpenMapTiles.</li>
          <li>Faltou um bairro ou tem um nome errado? <button type="button" className="link" onClick={() => abrirModal({ contato: 'Sugestão ou erro no site' })}>Conte para a gente</button>.</li>
        </ul>
      </section>

      <section className="chamada">
        <div><h2>Quer apoiar o projeto?</h2><p>Empresas, associações de bairro e entidades podem apoiar institucionalmente, sem qualquer influência sobre a moderação.</p></div>
        <div className="linha">
          <button type="button" className="btn ouro" onClick={() => navegar('/')}>Apontar um problema</button>
          <button type="button" className="btn claro" onClick={() => abrirModal({ contato: '' })}>Fale com a gente</button>
        </div>
      </section>
      <EspacoPatrocinio espaco="sobre" />
      <p className="centro suave"><button type="button" className="link" onClick={() => navegar('/termos')}>Termos de uso</button> · <button type="button" className="link" onClick={() => navegar('/privacidade')}>Política de privacidade</button></p>
    </div></section>
  );
}
