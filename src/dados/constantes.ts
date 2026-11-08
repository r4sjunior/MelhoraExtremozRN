import type { EspacoId, Regras, Status, ZonaId } from '../types';

export const NOME_APP = 'Melhora Extremoz';
export const CONTATO_EMAIL = 'r4sjunior@gmail.com';
export const RESPONSAVEL = 'Ednilson Junior';
export const VERSAO_TERMOS = '2026-11-08';

export const CATEGORIAS: [string, string][] = [
  ['buraco', 'Buraco na via'],
  ['iluminacao', 'Iluminação apagada ou fraca'],
  ['lixo', 'Lixo ou entulho'],
  ['agua', 'Falta de água ou vazamento'],
  ['esgoto', 'Esgoto a céu aberto'],
  ['alagamento', 'Alagamento ou drenagem'],
  ['erosao', 'Erosão ou areia na via'],
  ['praia', 'Problema na praia ou nas dunas'],
  ['lagoa', 'Problema na lagoa ou no rio'],
  ['arvore', 'Árvore ou poda'],
  ['animal', 'Animal abandonado'],
  ['sinalizacao', 'Sinalização ou faixa'],
  ['transporte', 'Ônibus ou ponto de parada'],
  ['acessibilidade', 'Falta de acessibilidade'],
  ['espaco', 'Praça ou espaço abandonado'],
  ['inseguro', 'Lugar inseguro'],
  ['poluicao', 'Barulho ou poluição'],
  ['outro', 'Outro'],
];
export const NOME_CATEGORIA: Record<string, string> = Object.fromEntries(CATEGORIAS);

export const STATUS_NOME: Record<Status, string> = {
  aberto: 'Aberto',
  andamento: 'Em andamento',
  resolvido: 'Resolvido',
  removido: 'Removido',
};

export const ZONAS: [ZonaId, string][] = [
  ['sede', 'Sede'],
  ['moinho', 'Moinho e Conjuntos'],
  ['estivas', 'Estivas e Sport Clube'],
  ['litoral', 'Pitangui e Litoral Norte'],
  ['genipabu', 'Genipabu e Redinha Nova'],
  ['interior', 'Interior'],
];
export const NOME_ZONA = Object.fromEntries(ZONAS) as Record<ZonaId, string>;
export const COR_ZONA: Record<ZonaId, string> = {
  sede: '#f4b41a',
  moinho: '#0e6b5a',
  estivas: '#7a9e3f',
  litoral: '#1786c5',
  genipabu: '#e0833a',
  interior: '#8b7a5c',
};

// Escala de calor: quanto mais apoios, mais quente.
export const FAIXAS_APOIO = [1, 3, 10, 25, 50];
export const CORES_APOIO = ['#e9b824', '#ef9a26', '#e6702a', '#d24526', '#a31d1d'];
export const COR_RESOLVIDO = '#1f9d63';
export const COR_ANDAMENTO = '#1786c5';

export function faixaDeApoio(n: number): number {
  let i = 0;
  FAIXAS_APOIO.forEach((f, k) => { if (n >= f) i = k; });
  return i;
}

export const MOTIVO_GRAVE = 'Conteúdo sexual, violento ou ilegal';
export const MOTIVOS_DENUNCIA = ['Não é um problema urbano', 'Conteúdo ofensivo', MOTIVO_GRAVE, 'Informação falsa', 'Duplicado', 'Expõe dados pessoais'];

export const ASSUNTOS = ['Apoio institucional', 'Imprensa', 'Sugestão ou erro no site', 'Dados pessoais (LGPD)', 'Outro'];

export const REGRAS_PADRAO: Regras = {
  publicacoes_por_janela: 2,
  janela_horas: 1,
  denuncias_ocultar: 3,
  idade_minima_denuncia_horas: 24,
};

export const ESPACOS: [EspacoId, string, string][] = [
  ['topo', 'Faixa do topo', 'Acima do menu, em todas as abas'],
  ['mapa', 'Painel do mapa', 'No fim do painel ao lado do mapa'],
  ['prioridades', 'Prioridades', 'No fim da lista'],
  ['cobrar', 'Cobrar', 'No fim da página'],
  ['sobre', 'Sobre', 'No fim da página'],
];

export const MAX_FOTOS = 3;
export const RAIO_DUPLICADO_M = 80;
/** A partir desta distância, o ponto é tratado como local sem endereço cadastrado. */
export const DIST_SEM_ENDERECO_M = 150;
export const ZOOM_MINIMO_APONTAR = 14;
