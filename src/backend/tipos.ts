import type {
  CadastroMfa, Comentario, DenunciaAdmin, EstadoMfa, EventoHistorico, Mensagem, NovoProblema, PainelAcessos,
  Patrocinio, Problema, Regras, Sessao, Status, UsuarioAdmin,
} from '../types';

/** Erro de regra de negócio: a mensagem pode ser mostrada ao usuário. */
export class ErroRegra extends Error {}

export interface Backend {
  modo: 'teste' | 'supabase';
  captchaSiteKey: string;

  sessao(): Promise<Sessao | null>;
  aoMudarSessao(cb: () => void): void;
  entrarGoogle(): Promise<void>;
  entrarEmail(email: string, captcha?: string): Promise<void>;
  /** Só no modo de teste: entra sem servidor de e-mail. */
  entrarTeste?(nome: string, admin: boolean): Promise<void>;
  sair(): Promise<void>;
  excluirConta(): Promise<void>;
  mudarNome(nome: string): Promise<void>;

  regras(): Promise<Regras>;
  problemas(): Promise<Problema[]>;
  assinarProblemas(cb: () => void): () => void;
  publicar(p: NovoProblema): Promise<void>;
  excluirProblema(p: Problema): Promise<void>;
  /** Momentos das publicações recentes da pessoa, para mostrar a espera antes de enviar. */
  minhasPublicacoesRecentes(): Promise<number[]>;

  meusApoios(): Promise<string[]>;
  apoiar(id: string, ligado: boolean): Promise<void>;
  minhasDenuncias(): Promise<string[]>;
  denunciar(id: string, motivo: string): Promise<void>;

  comentarios(id: string): Promise<Comentario[]>;
  comentar(id: string, texto: string): Promise<void>;
  excluirComentario(id: string): Promise<void>;
  historico(id: string): Promise<EventoHistorico[]>;
  definirProtocolo(id: string, protocolo: string): Promise<void>;

  enviarFoto(blob: Blob): Promise<string>;
  urlFoto(caminho: string): string;
  apagarFotos(caminhos: string[]): Promise<void>;

  patrocinios(): Promise<Patrocinio[]>;
  enviarMensagem(email: string, assunto: string, texto: string): Promise<void>;
  registrarVisita(sessao: string, visitante: string, pagina: string, dispositivo: string, origem: string): Promise<void>;

  admin: {
    denuncias(): Promise<DenunciaAdmin[]>;
    moderar(id: string, acao: 'manter' | 'remover'): Promise<void>;
    mudarStatus(id: string, status: Exclude<Status, 'removido'>, nota?: string): Promise<void>;
    mensagens(): Promise<Mensagem[]>;
    marcarLida(id: string, lida: boolean): Promise<void>;
    usuarios(): Promise<UsuarioAdmin[]>;
    suspender(id: string, suspenso: boolean): Promise<void>;
    salvarRegras(r: Regras): Promise<void>;
    salvarPatrocinios(lista: Patrocinio[]): Promise<void>;
    acessos(dias: number): Promise<PainelAcessos>;
    mfaEstado(): Promise<EstadoMfa>;
    mfaCadastrar(): Promise<CadastroMfa>;
    mfaConfirmar(id: string, codigo: string): Promise<void>;
  };
}
