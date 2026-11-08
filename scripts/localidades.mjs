// Tabela editorial: une as grafias do CNEFE 2022 e propõe uma zona para cada localidade.
// As zonas NÃO são divisão oficial do município: foram propostas para organizar o mapa.
// Para corrigir uma localidade, edite aqui e rode `npm run geodata`.

export const ZONAS = {
  sede: 'Sede',
  moinho: 'Moinho e Conjuntos',
  estivas: 'Estivas e Sport Clube',
  litoral: 'Pitangui e Litoral Norte',
  genipabu: 'Genipabu e Redinha Nova',
  interior: 'Interior',
};

// grafia no CNEFE -> [nome exibido, zona]
export const LOCALIDADES = {
  'CENTRO': ['Centro', 'sede'],
  'IRAQUE': ['Iraque', 'sede'],
  'IRA': ['Iraque', 'sede'],
  'MALVINAS': ['Malvinas', 'sede'],
  'MALVINA': ['Malvinas', 'sede'],
  'POVOADO MALVINAS': ['Malvinas', 'sede'],
  'POVOADO DAS MALVINAS': ['Malvinas', 'sede'],
  'NOVO HORIZONTE': ['Novo Horizonte', 'sede'],
  'LOTEAMENTO PARQUE DAS FLORES': ['Parque das Flores', 'sede'],
  'LOTEAMENTO JARDIM': ['Loteamento Jardim', 'sede'],
  'LOTEAMENTO JOAQUIM DE GOIS': ['Joaquim de Góis', 'sede'],
  'CONJUNTO NOVA EXTREMOZ': ['Nova Extremoz', 'sede'],
  'CONJUNTO ELSHADAY': ['El Shaday', 'sede'],
  'LOTEAMENTO EL SHADAY': ['El Shaday', 'sede'],
  'SANTO AMARO': ['Santo Amaro', 'sede'],
  'GUAJIRU': ['Guajiru', 'sede'],
  'VILA REAL': ['Vila Real', 'sede'],
  'VILA SOCO': ['Vila Socó', 'sede'],
  'PARQUE DA JAQUEIRA': ['Parque da Jaqueira', 'sede'],

  'MOINHO DOS VENTOS': ['Moinho dos Ventos', 'moinho'],
  'CONJUNTO MOINHO': ['Conjunto Moinho', 'moinho'],
  'ALTO DO MOINHO': ['Alto do Moinho', 'moinho'],
  'VILA NOVA': ['Vila Nova', 'genipabu'],
  'PASSAGEM DA VILA': ['Passagem da Vila', 'moinho'],
  'POVOADO PASSAGEM DA VILA': ['Passagem da Vila', 'moinho'],
  'SITIO DENDE': ['Sítio Dendê', 'moinho'],
  'VILA MARIA': ['Vila Maria', 'moinho'],
  'VILA MARIA 1': ['Vila Maria', 'moinho'],
  'PARQUE DOS SERVIDORES': ['Parque dos Servidores', 'moinho'],
  'PARQUE DAS CAMELIAS': ['Parque das Camélias', 'moinho'],
  'QUINTA DAS FIGUEIRAS': ['Quinta das Figueiras', 'moinho'],
  'RIVIERA': ['Riviera', 'moinho'],
  'CENTRAL PARQUE 3': ['Central Parque 3', 'moinho'],
  'CENTRAL PARK 3': ['Central Parque 3', 'moinho'],
  'CENTRAL PARK': ['Central Park', 'moinho'],
  'CENTER PARK': ['Center Park', 'moinho'],
  'SANTA CELIA': ['Santa Célia', 'moinho'],
  'SAO FRANCISCO': ['São Francisco', 'moinho'],
  'BOSQUE DE EXTREMOZ': ['Bosque de Extremoz', 'moinho'],
  'JARDINS DE EXTREMOZ 2': ['Jardins de Extremoz', 'moinho'],
  'VILLAGE DOS COQUEIROS': ['Village dos Coqueiros', 'moinho'],
  'ESTRELA DO MAR': ['Estrela do Mar', 'moinho'],
  'CONJUNTO ESTRELA DO MAR': ['Estrela do Mar', 'moinho'],
  'PARQUE DA LAGOA': ['Parque da Lagoa', 'moinho'],
  'SAO MIGUEL ARCANJO': ['São Miguel Arcanjo', 'moinho'],
  'RN 160': ['RN-160', 'moinho'],
  'ALTO EXTREMOZ': ['Alto Extremoz', 'moinho'],
  'CHACARA': ['Chácara', 'moinho'],
  'RENASCER': ['Renascer', 'moinho'],

  'ESTIVAS': ['Estivas', 'estivas'],
  'LOTEAMENTO PARAISO DE ESTIVAS': ['Paraíso de Estivas', 'estivas'],
  'CENTRAL PARQUE CLUBE': ['Central Parque Clube', 'estivas'],
  'VILA SAO SEBASTIAO': ['Vila São Sebastião', 'estivas'],
  'SIMAO': ['Simão', 'estivas'],
  'SPORT CLUBE': ['Sport Clube', 'estivas'],
  'SPORT CLUBE 1': ['Sport Clube', 'estivas'],
  'MURICI': ['Murici', 'estivas'],
  'PEDRINHAS': ['Pedrinhas', 'estivas'],
  'BR 101': ['BR-101', 'estivas'],

  'PITANGUI': ['Pitangui', 'litoral'],
  'BARRA DO RIO': ['Barra do Rio', 'litoral'],
  'CONTENDA': ['Contenda', 'litoral'],
  'CONTENDAS': ['Contenda', 'litoral'],
  'IMBIRIBEIRA': ['Imbiribeira', 'litoral'],
  'BARRO VERMELHO': ['Barro Vermelho', 'litoral'],

  'REDINHA NOVA': ['Redinha Nova', 'genipabu'],
  'SANTA RITA': ['Santa Rita', 'genipabu'],
  'GENIPABU': ['Genipabu', 'genipabu'],
  'POVOADO GENIPABU': ['Genipabu', 'genipabu'],
  'CAMPINAS': ['Campinas', 'genipabu'],
  'COMUNIDADE CAMPINAS': ['Campinas', 'genipabu'],
  'PORTAL DO SOL': ['Portal do Sol', 'genipabu'],
  'GRUTA': ['Gruta', 'genipabu'],
  'GRUTAS': ['Gruta', 'genipabu'],
  'LAGOA AZUL': ['Lagoa Azul', 'genipabu'],
  'BOCA DA ILHA': ['Boca da Ilha', 'genipabu'],

  'ARACA': ['Araçá', 'interior'],
  'VILA DE FATIMA': ['Vila de Fátima', 'interior'],
  'SANTA MARIA': ['Santa Maria', 'interior'],
  'NOVA ESPERANCA': ['Nova Esperança', 'interior'],
  'POVOADO NOVA ESPERANCA': ['Nova Esperança', 'interior'],
  'CAPIM': ['Capim', 'interior'],
  'CARAO': ['Carão', 'interior'],
  'COMUNIDADE COMUM': ['Comunidade Comum', 'interior'],
  'FAZENDA ALTO DA VISTA': ['Fazenda Alto da Vista', 'interior'],
  'MASSARANDUBA': ['Massaranduba', 'interior'],
};

// O CNEFE vem em maiúsculas e sem acentos. Corrigimos os casos mais comuns só para exibição.
const ACENTOS = {
  SAO: 'São', JOAO: 'João', JOSE: 'José', ANTONIO: 'Antônio', FATIMA: 'Fátima', CICERO: 'Cícero', CAMARAO: 'Camarão',
  MARCO: 'Março', ACAI: 'Açaí', ARACA: 'Araçá', ACUCENA: 'Açucena', ACACIA: 'Acácia', ALIANCA: 'Aliança', AMELIA: 'Amélia',
  ARAUJO: 'Araújo', ANGELICA: 'Angélica', ANISIO: 'Anísio', ANEZIO: 'Anézio', ADELIA: 'Adélia', ALUIZIO: 'Aluízio',
  ANDRE: 'André', BRASILIA: 'Brasília', BRASIL: 'Brasil', CEARA: 'Ceará', PARA: 'Pará', PARAIBA: 'Paraíba', PIAUI: 'Piauí',
  GOIAS: 'Goiás', GOIANIA: 'Goiânia', MACEIO: 'Maceió', PARANA: 'Paraná', ESPIRITO: 'Espírito', MARANHAO: 'Maranhão',
  RONDONIA: 'Rondônia', AMAPA: 'Amapá', AMAZONIA: 'Amazônia', VITORIA: 'Vitória', GLORIA: 'Glória', MARIO: 'Mário',
  LUCIA: 'Lúcia', CECILIA: 'Cecília', VIRGINIA: 'Virgínia', GETULIO: 'Getúlio', TEOFILO: 'Teófilo', NOBREGA: 'Nóbrega',
  GOIS: 'Góis', GONCALVES: 'Gonçalves', GONCALO: 'Gonçalo', LOURENCO: 'Lourenço', FRANCA: 'França', PACO: 'Paço',
  PRACA: 'Praça', PORTUGAL: 'Portugal', SAUDE: 'Saúde', SITIO: 'Sítio', AGUA: 'Água', AGUAS: 'Águas', PEROLA: 'Pérola',
  ARVORE: 'Árvore', ARVORES: 'Árvores', PASSARO: 'Pássaro', ALAMO: 'Álamo', IRMA: 'Irmã', IRMAO: 'Irmão', MAE: 'Mãe',
  MANGUE: 'Mangue', ITALIA: 'Itália', ALBANIA: 'Albânia', ARGENTINA: 'Argentina', CANADA: 'Canadá', PANAMA: 'Panamá',
  JAPAO: 'Japão', JOAQUIM: 'Joaquim', JOSEFA: 'Josefa', JESUS: 'Jesus', LIRIO: 'Lírio', LIRIOS: 'Lírios', JASMIM: 'Jasmim',
  BEIJA: 'Beija', TAMBAU: 'Tambaú', MARACANA: 'Maracanã', CAJU: 'Caju', PITANGUI: 'Pitangui', LITORANEA: 'Litorânea',
  ANTONIA: 'Antônia', ANTONIOS: 'Antônios', SEBASTIAO: 'Sebastião', TOME: 'Tomé', RAIMUNDO: 'Raimundo', LUIS: 'Luís',
  INACIO: 'Inácio', INARCIO: 'Inárcio', MONICA: 'Mônica', VERONICA: 'Verônica', ANGELA: 'Ângela', AUREA: 'Áurea',
  ALVARO: 'Álvaro', PLACIDO: 'Plácido', OTAVIO: 'Otávio', FLAVIO: 'Flávio', CLAUDIO: 'Cláudio', SERGIO: 'Sérgio',
  JULIO: 'Júlio', ROGERIO: 'Rogério', EMILIO: 'Emílio', VALERIO: 'Valério', ZE: 'Zé', DENDE: 'Dendê', VOVO: 'Vovó',
};
const MINUSCULAS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'EM']);

function palavra(w, primeira) {
  if (ACENTOS[w]) return ACENTOS[w];
  if (!primeira && MINUSCULAS.has(w)) return w.toLowerCase();
  if (/^\d/.test(w)) return w.toLowerCase();
  if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/.test(w)) return w;
  let s = w[0] + w.slice(1).toLowerCase();
  // Terminações portuguesas que quase sempre levam til/cedilha
  s = s.replace(/cao$/, 'ção').replace(/coes$/, 'ções').replace(/sao$/, 'são').replace(/encia$/, 'ência').replace(/ancia$/, 'ância');
  return s;
}

export function titulo(s) {
  return s.trim().replace(/\s+/g, ' ').split(' ').map((w, i) => palavra(w, i === 0)).join(' ');
}

// Tipo + título + nome -> "Rua São Pedro"; vias sem nome ficam explícitas.
export function nomeDaVia(tipo, tit, nome) {
  const t = titulo(tipo || '');
  if (!nome || /^SEM DENOMINACAO/.test(nome)) return `${t || 'Via'} sem nome`;
  const partes = [t, tit ? titulo(tit) : '', titulo(nome)];
  return partes.filter(Boolean).join(' ').replace(/\s+de\s*$/, '');
}
