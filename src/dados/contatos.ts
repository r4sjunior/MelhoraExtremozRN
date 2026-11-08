// Fontes conferidas em 08/11/2026:
// - Prefeitura: extremoz.rn.gov.br (rodapé do site, "A Prefeita", "Prefeitura Digital", "Secretarias e Órgãos")
// - Câmara: endereço e telefone em documentos publicados no portal do TCE-RN (telefone citado em edital de 2017: confirmar)
// - Eleitos: dados abertos do TSE, consulta de candidaturas 2024 (partido é o da eleição; pode ter mudado)

export interface Canal { nome: string; desc: string; url: string }

export const PREFEITURA = {
  gestora: 'Jussara Sales de Souza',
  vice: 'Izidoro Filho',
  endereco: 'Rua Capitão José da Penha, Extremoz/RN',
  telefone: '(84) 3279-4910',
  email: 'gabinetecivilextremoz@gmail.com',
  horario: 'Gabinete Civil: segunda a sexta, das 7h às 13h',
  site: 'https://extremoz.rn.gov.br/',
  instagram: 'https://www.instagram.com/prefeituradeextremozrn/',
  facebook: 'https://www.facebook.com/prefeituradeextremoz/',
};

export const CANAIS_PREFEITURA: Canal[] = [
  { nome: 'Ouvidoria', desc: 'Registre reclamações e pedidos e guarde o número gerado', url: 'https://extremoz.1doc.com.br/b.php?pg=wp/wp&itd=4' },
  { nome: 'Protocolos', desc: 'Requerimentos administrativos à Prefeitura', url: 'https://extremoz.1doc.com.br/b.php?pg=wp/wp&itd=5' },
  { nome: 'e-SIC', desc: 'Pedidos de informação pública (Lei de Acesso à Informação)', url: 'https://extremoz.1doc.com.br/b.php?pg=wp/detalhes&itd=7' },
  { nome: 'Secretarias e órgãos', desc: 'Lista completa no site da Prefeitura', url: 'https://extremoz.rn.gov.br/secretarias-e-orgaos/' },
];

export const SECRETARIAS: Canal[] = [
  { nome: 'Obras Públicas e Projetos (SMOP)', desc: 'Obras e infraestrutura', url: 'https://extremoz.rn.gov.br/secretarias/secretaria-de-obras-projetos-e-convenios/' },
  { nome: 'Iluminação e Serviços Urbanos (SEMISUR)', desc: 'Iluminação pública e serviços urbanos', url: 'https://extremoz.rn.gov.br/secretarias/secretaria-municipal-de-infraestrutura-e-servicos-publicos/' },
  { nome: 'Meio Ambiente, Urbanismo e Mudanças Climáticas (SEMUR)', desc: 'Meio ambiente e urbanismo', url: 'https://extremoz.rn.gov.br/secretarias/secretaria-municipal-de-meio-ambiente-e-urbanismo/' },
  { nome: 'Transporte e Trânsito Urbano (STTU)', desc: 'Trânsito, sinalização e transporte', url: 'https://extremoz.rn.gov.br/secretarias/secretaria-municipal-de-transporte-e-transito-urbano-smttu/' },
];

export const CAMARA = {
  endereco: 'Rua Felipe Camarão, 139, Centro, Extremoz/RN',
  telefone: '(84) 3279-2351',
  email: 'camaradeextremoz@gmail.com',
  presidente: 'Anderson Barbosa da Silva',
};

// Nome de urna e partido pelo qual foi eleito(a) em 2024.
export const VEREADORES: [string, string][] = [
  ['Alexandre Ramalho', 'Podemos'],
  ['Allan Delon', 'Republicanos'],
  ['Cleiton da Habitação', 'PL'],
  ['Damares de Sales', 'Podemos'],
  ['Dicinho', 'PP'],
  ['Eduardo Motta', 'União'],
  ['Eliane Carneiro', 'Republicanos'],
  ['Fabio Vicente', 'PL'],
  ['Godô', 'Podemos'],
  ['Lucas Rafael', 'PSDB'],
  ['Michele de Góis', 'PL'],
  ['Professor Anderson Barbosa', 'PSDB'],
  ['Professor Fabiano', 'União'],
  ['Ricardo Caridade', 'PL'],
  ['Tatiany Oliveira', 'PSDB'],
];
