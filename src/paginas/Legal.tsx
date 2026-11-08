import { CONTATO_EMAIL, RESPONSAVEL } from '../dados/constantes';
import { navegar } from '../lib/rota';

const Volta = () => <button type="button" className="btn peq claro" onClick={() => navegar('/sobre')}>← Voltar</button>;
const Atualizacao = () => <p className="suave">Versão de 8 de novembro de 2026.</p>;

export function Termos() {
  return (
    <section className="pagina"><article className="largura estreita legal">
      <Volta />
      <h1>Termos de uso</h1>
      <Atualizacao />
      <h2>1. O que é</h2>
      <p>O Melhora Extremoz é um mapa colaborativo, gratuito e independente, para registrar e acompanhar problemas urbanos de Extremoz/RN. É mantido por {RESPONSAVEL} ({CONTATO_EMAIL}). Não é canal oficial da Prefeitura, da Câmara ou de qualquer órgão e não executa os serviços apontados. Para pedidos formais, use os canais oficiais.</p>
      <h2>2. Quem pode participar</h2>
      <p>Para publicar, apoiar, comentar e denunciar é preciso ter conta e 18 anos ou mais, ou autorização do responsável legal. Você responde pelo que faz na sua conta e pode excluí-la quando quiser.</p>
      <h2>3. O que você pode publicar</h2>
      <p>Publique problemas reais, descritos com honestidade. Ao publicar, você declara que o conteúdo é verdadeiro até onde sabe e que tem direito de usar as fotos.</p>
      <h2>4. O que não é permitido</h2>
      <ul>
        <li>Conteúdo falso, ofensivo, discriminatório, ameaçador, sexual, violento ou ilegal.</li>
        <li>Fotos com rostos identificáveis, placas de veículos ou dados pessoais de terceiros sem autorização.</li>
        <li>Acusações contra pessoas específicas, ataques pessoais, propaganda comercial ou eleitoral e spam.</li>
        <li>Contas falsas, robôs, burlar limites ou tentar acessar dados e partes do sistema que não são suas.</li>
      </ul>
      <h2>5. Moderação</h2>
      <p>A comunidade pode denunciar publicações. Publicações denunciadas podem sair do mapa automaticamente até a revisão. A moderação pode mudar status, remover conteúdo e suspender contas que violem estes termos. Apoiadores institucionais não influenciam a moderação.</p>
      <h2>6. Conteúdo</h2>
      <p>Você continua dono do que publica e autoriza o Melhora Extremoz a exibi-lo publicamente e a compartilhá-lo para dar visibilidade ao problema, inclusive com órgãos públicos e imprensa, enquanto estiver publicado.</p>
      <h2>7. Limites do serviço</h2>
      <p>O serviço é oferecido como está, sem garantia de disponibilidade, de exatidão dos endereços ou contatos, nem de que os problemas serão resolvidos. As informações publicadas são de responsabilidade de quem as publicou.</p>
      <h2>8. Mudanças e foro</h2>
      <p>Estes termos podem mudar; a versão vigente fica nesta página. Aplica-se a lei brasileira, sem prejuízo do foro do domicílio do consumidor quando a lei o assegurar.</p>
    </article></section>
  );
}

export function Privacidade() {
  return (
    <section className="pagina"><article className="largura estreita legal">
      <Volta />
      <h1>Política de privacidade</h1>
      <Atualizacao />
      <h2>Quem cuida dos dados</h2>
      <p>O controlador é {RESPONSAVEL}. Fale pelo e-mail {CONTATO_EMAIL} ou pelo formulário "Fale com a gente".</p>
      <h2>Quais dados tratamos</h2>
      <ul>
        <li><b>Conta:</b> e-mail e, no login com Google, nome e foto informados pelo Google. O e-mail nunca aparece no site. Você escolhe o nome público ou aparece como "Morador(a)".</li>
        <li><b>Publicações:</b> local, tipo, título, descrição, fotos, protocolo e comentários são públicos, junto com o nome escolhido. Quem apoiou ou denunciou não é mostrado.</li>
        <li><b>Fotos:</b> são regravadas no seu aparelho antes do envio, o que retira metadados como a localização GPS. Mesmo assim, evite mostrar rostos e placas.</li>
        <li><b>Mensagens:</b> e-mail, assunto e texto enviados pelo "Fale com a gente".</li>
        <li><b>Segurança:</b> os provedores de login e hospedagem registram data, hora e endereço IP dos acessos.</li>
        <li><b>Estatísticas:</b> contagem própria de visitas com um código aleatório do navegador, sem guardar IP, nome ou e-mail.</li>
        <li><b>Localização:</b> o botão "onde estou" usa o GPS só no seu aparelho, para mover o mapa, e só se você permitir. O que é publicado é o ponto que você marcar.</li>
      </ul>
      <h2>Para que e com qual base legal (LGPD)</h2>
      <ul>
        <li>Prestar o serviço previsto nos Termos de uso (art. 7º, V).</li>
        <li>Segurança, prevenção de abuso, moderação e estatísticas, por legítimo interesse (art. 7º, IX).</li>
        <li>Cumprir obrigação legal ou ordem judicial (art. 7º, II e VI).</li>
      </ul>
      <p>Não vendemos dados e não fazemos publicidade direcionada.</p>
      <h2>Com quem os dados passam</h2>
      <p>Supabase (banco, login e fotos), Vercel (hospedagem), Google (se você entrar com Google), Cloudflare (verificação contra robôs, quando ativa) e OpenFreeMap ou OpenStreetMap (imagens do mapa, que recebem seu IP). Alguns provedores podem armazenar dados fora do Brasil, com as salvaguardas exigidas pela LGPD. Podemos compartilhar dados com autoridades quando a lei exigir.</p>
      <h2>Por quanto tempo</h2>
      <ul>
        <li>Conta: enquanto existir.</li>
        <li>Publicações, fotos e comentários: até você excluir, a moderação remover ou a conta ser excluída.</li>
        <li>Mensagens: até 2 anos.</li>
        <li>Estatísticas: até 400 dias.</li>
      </ul>
      <h2>Seus direitos</h2>
      <p>Para excluir sua conta e tudo o que publicou, use "Sua conta › Excluir minha conta". Para acesso, correção ou outros pedidos, escreva para {CONTATO_EMAIL}; respondemos em até 15 dias. Você também pode reclamar à ANPD.</p>
      <h2>No seu navegador</h2>
      <p>Guardamos só o necessário para manter você conectado, lembrar preferências, salvar rascunhos e contar visitas de forma anônima. Não usamos cookies de publicidade ou rastreadores de terceiros.</p>
      <h2>Crianças e adolescentes</h2>
      <p>O uso com conta é para maiores de 18 anos ou com autorização do responsável.</p>
    </article></section>
  );
}
