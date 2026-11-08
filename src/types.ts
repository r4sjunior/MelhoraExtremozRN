export type Status = 'aberto' | 'andamento' | 'resolvido' | 'removido';
export type ZonaId = 'sede' | 'moinho' | 'estivas' | 'litoral' | 'genipabu' | 'interior';

export interface Problema {
  id: string;
  autor_id: string;
  autor_nome: string;
  categoria: string;
  titulo: string;
  descricao: string;
  via: string;
  numero: string | null;
  referencia: string | null;
  localidade: string;
  zona: ZonaId;
  lat: number;
  lon: number;
  fotos: string[];
  status: Status;
  protocolo: string | null;
  apoios: number;
  comentarios: number;
  denuncias_pendentes: number;
  graves_pendentes: number;
  denuncias_total: number;
  criado_em: string;
  atualizado_em: string;
}

export type NovoProblema = Pick<Problema, 'id' | 'categoria' | 'titulo' | 'descricao' | 'via' | 'numero' | 'referencia' | 'localidade' | 'zona' | 'lat' | 'lon' | 'fotos'>;

export interface Comentario {
  id: string;
  problema_id: string;
  autor_id: string;
  autor_nome: string;
  texto: string;
  em: string;
}

export interface EventoHistorico {
  id: string | number;
  status: string;
  protocolo: string | null;
  nota: string | null;
  em: string;
}

export interface Regras {
  publicacoes_por_janela: number;
  janela_horas: number;
  denuncias_ocultar: number;
  idade_minima_denuncia_horas: number;
}

export type EspacoId = 'topo' | 'mapa' | 'prioridades' | 'cobrar' | 'sobre';

export interface Patrocinio {
  id: string;
  patrocinador: string;
  titulo: string;
  texto: string;
  botao: string;
  url: string | null;
  imagem: string | null;
  ativo: boolean;
  espacos: EspacoId[];
  segundos: number;
  ordem: number;
}

export interface Sessao {
  id: string;
  email: string;
  nome: string;
  nomeEscolhido: boolean;
  /** Tem cadastro de administrador (pode ainda faltar a verificação em duas etapas). */
  adminCadastrado: boolean;
  /** Poderes de administrador confirmados pelo servidor. */
  isAdmin: boolean;
  suspenso: boolean;
}

export interface Mensagem {
  id: string;
  email: string;
  assunto: string;
  texto: string;
  lida: boolean;
  em: string;
}

export interface UsuarioAdmin {
  id: string;
  nome: string;
  criado_em: string;
  problemas: number;
  apoios: number;
  comentarios: number;
  denuncias_feitas: number;
  denuncias_recebidas: number;
  suspenso: boolean;
}

export interface DenunciaAdmin {
  problema_id: string;
  motivo: string;
  grave: boolean;
  revisada: boolean;
}

export interface PainelAcessos {
  visitas: number;
  pessoas: number;
  por_dia: { dia: string; visitas: number; pessoas: number }[];
  dispositivos: Record<string, number>;
  origens: { origem: string; visitas: number }[];
  paginas: Record<string, number>;
}

export interface EstadoMfa {
  nivel: string;
  fatores: { id: string }[];
}

export interface CadastroMfa {
  id: string;
  qr: string;
  segredo: string;
}
