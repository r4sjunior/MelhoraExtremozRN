// Gera os dados do mapa em public/data a partir de fontes abertas do IBGE (Censo 2022):
//  - CNEFE: endereços de Extremoz (usamos só via, número, localidade e coordenada; nada de complemento ou estabelecimento)
//  - Malha de setores censitários do RN: contorno do município e áreas aproximadas das zonas
// Uso: npm run geodata (baixa os arquivos para scripts/.cache na primeira vez)
import { mkdirSync, existsSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import mapshaper from 'mapshaper';
import { LOCALIDADES, ZONAS, nomeDaVia } from './localidades.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CACHE = join(AQUI, '.cache');
const SAIDA = join(AQUI, '..', 'public', 'data');
const COD = '2403608';
const URL_CNEFE = 'https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/24_RN/2403608_EXTREMOZ.zip';
const URL_SETORES = 'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/setores/shp/UF/RN_setores_CD2022.zip';

async function baixar(url, nome) {
  const p = join(CACHE, nome);
  if (existsSync(p)) return p;
  console.log('Baixando', url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  return p;
}

function lerCsv(txt) {
  const linhas = txt.split(/\r?\n/).filter(Boolean);
  const cab = linhas[0].replace(/^﻿/, '').split(';');
  return linhas.slice(1).map((l) => {
    const c = l.split(';');
    return Object.fromEntries(cab.map((k, i) => [k, (c[i] ?? '').trim()]));
  });
}

mkdirSync(CACHE, { recursive: true });
mkdirSync(SAIDA, { recursive: true });
const zipCnefe = await baixar(URL_CNEFE, 'cnefe.zip');
const zipSetores = await baixar(URL_SETORES, 'setores.zip');

// ---------- endereços ----------
const z = new AdmZip(zipCnefe);
const linhas = lerCsv(z.getEntries()[0].getData().toString('utf8'));
console.log('Endereços no CNEFE:', linhas.length);

const faltando = new Set();
const locs = new Map(); // nome -> {n,z,la,lo,c}
const ruas = new Map(); // via|localidade -> {n,l,pts:Map}
const setorZona = new Map(); // setor -> {zona: contagem}
let usados = 0;

for (const r of linhas) {
  const lat = parseFloat(r.LATITUDE), lon = parseFloat(r.LONGITUDE);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  const m = LOCALIDADES[r.DSC_LOCALIDADE];
  if (!m) { faltando.add(r.DSC_LOCALIDADE); continue; }
  const [nomeLoc, zona] = m;
  usados++;
  const s = setorZona.get(r.COD_SETOR) || {};
  s[zona] = (s[zona] || 0) + 1;
  setorZona.set(r.COD_SETOR, s);

  const L = locs.get(nomeLoc) || { n: nomeLoc, z: zona, la: 0, lo: 0, c: 0 };
  L.la += lat; L.lo += lon; L.c++;
  locs.set(nomeLoc, L);

  const via = nomeDaVia(r.NOM_TIPO_SEGLOGR, r.NOM_TITULO_SEGLOGR, r.NOM_SEGLOGR);
  const chave = via + '|' + nomeLoc;
  const R = ruas.get(chave) || { n: via, l: nomeLoc, pts: new Map() };
  const num = parseInt(r.NUM_ENDERECO, 10) || 0;
  const la = Math.round(lat * 1e5), lo = Math.round(lon * 1e5);
  // Um ponto por número; os "sem número" são reduzidos a uma grade de ~20 m.
  const kp = num ? `n${num}` : `g${Math.round(la / 20)}_${Math.round(lo / 20)}`;
  if (!R.pts.has(kp)) R.pts.set(kp, [num, la, lo]);
  ruas.set(chave, R);
}
if (faltando.size) throw new Error('Localidades sem mapeamento em scripts/localidades.mjs: ' + [...faltando].join(', '));

const listaLocs = [...locs.values()]
  .map((L) => ({ n: L.n, z: L.z, la: +(L.la / L.c).toFixed(5), lo: +(L.lo / L.c).toFixed(5), c: L.c }))
  .sort((a, b) => a.n.localeCompare(b.n, 'pt'));
const idxLoc = new Map(listaLocs.map((L, i) => [L.n, i]));

const listaRuas = [...ruas.values()]
  .map((R) => {
    const pts = [...R.pts.values()].sort((a, b) => a[0] - b[0]);
    const nums = pts.map((p) => p[0]).filter(Boolean);
    return [R.n, idxLoc.get(R.l), nums.length ? nums[0] : 0, nums.length ? nums[nums.length - 1] : 0, pts];
  })
  .sort((a, b) => a[0].localeCompare(b[0], 'pt') || a[1] - b[1]);

writeFileSync(join(SAIDA, 'localidades.json'), JSON.stringify(listaLocs));
writeFileSync(join(SAIDA, 'ruas.json'), JSON.stringify(listaRuas));

// ---------- zonas e contorno ----------
// Cada setor censitário entra na zona que tem mais endereços dentro dele.
// O CNEFE traz o código do setor com um sufixo (ex.: "240360805000002P"), a malha não.
const codSetor = (c) => c.replace(/\D/g, '');
const zonaDoSetor = {};
for (const [setor, cont] of setorZona) {
  zonaDoSetor[codSetor(setor)] = Object.entries(cont).sort((a, b) => b[1] - a[1])[0][0];
}

const entrada = {};
for (const e of new AdmZip(zipSetores).getEntries()) entrada[e.entryName] = e.getData();
const extraido = await mapshaper.applyCommands(
  `-i RN_setores_CD2022.shp encoding=utf8 -filter "CD_MUN === '${COD}'" -proj wgs84 ` +
  `-o format=geojson setores.json`, entrada);
const setores = JSON.parse(extraido['setores.json'].toString());

// Centro aproximado de um setor: média dos vértices.
function centro(f) {
  let x = 0, y = 0, n = 0;
  const anda = (c) => {
    if (typeof c[0] === 'number') { x += c[0]; y += c[1]; n++; } else c.forEach(anda);
  };
  anda(f.geometry.coordinates);
  return [x / n, y / n];
}

// Setores sem endereço (lagoa, dunas) herdam a zona do setor com endereços mais próximo.
const comZona = setores.features
  .filter((f) => zonaDoSetor[codSetor(f.properties.CD_SETOR)])
  .map((f) => ({ c: centro(f), zona: zonaDoSetor[codSetor(f.properties.CD_SETOR)] }));
if (!comZona.length) throw new Error('Nenhum setor da malha casou com os códigos do CNEFE.');
for (const f of setores.features) {
  let zona = zonaDoSetor[codSetor(f.properties.CD_SETOR)];
  if (!zona) {
    const c = centro(f);
    let d = Infinity;
    for (const o of comZona) {
      const dd = (o.c[0] - c[0]) ** 2 + (o.c[1] - c[1]) ** 2;
      if (dd < d) { d = dd; zona = o.zona; }
    }
  }
  f.properties = { zona, nome: ZONAS[zona] };
}

const base = { 'setores.json': JSON.stringify(setores) };
const zonasGeo = await mapshaper.applyCommands(
  '-i setores.json -dissolve zona copy-fields=nome -simplify 60% keep-shapes -clean ' +
  '-o format=geojson precision=0.00001 zonas.json', base);
writeFileSync(join(SAIDA, 'zonas.json'), zonasGeo['zonas.json']);
const muni = await mapshaper.applyCommands(
  '-i setores.json -dissolve -simplify 60% keep-shapes -clean ' +
  '-o format=geojson precision=0.00001 municipio.json', base);
writeFileSync(join(SAIDA, 'municipio.json'), muni['municipio.json']);

// ---------- referências de bairro do OpenStreetMap ----------
// Arquivo separado, sob a licença ODbL (© colaboradores do OpenStreetMap). Não é misturado ao CNEFE.
const CORRIGE_OSM = { 'Jardim Portugual': 'Jardim Portugal', 'Parque das Carmélias': 'Parque das Camélias', 'Sport Club Natueza': 'Sport Club Natureza' };
const cacheOsm = join(CACHE, 'osm.json');
if (!existsSync(cacheOsm)) {
  console.log('Consultando o OpenStreetMap');
  const q = `[out:json][timeout:60];area["IBGE:GEOCODIGO"="${COD}"]->.a;nwr["place"~"suburb|neighbourhood|quarter|village|hamlet"](area.a);out tags center;`;
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'User-Agent': 'MelhoraExtremozBuild/1.0' },
  });
  if (!r.ok) throw new Error('Overpass: HTTP ' + r.status);
  writeFileSync(cacheOsm, Buffer.from(await r.arrayBuffer()));
}
const osm = JSON.parse(readFileSync(cacheOsm, 'utf8'));
const vistos = new Set();
const referencias = osm.elements
  .filter((e) => /^(suburb|neighbourhood|quarter|village|hamlet)$/.test(e.tags?.place || '') && e.tags?.name)
  .map((e) => ({ n: CORRIGE_OSM[e.tags.name] || e.tags.name, la: +(e.center?.lat ?? e.lat).toFixed(5), lo: +(e.center?.lon ?? e.lon).toFixed(5) }))
  .filter((r) => { const k = r.n.toLowerCase(); if (vistos.has(k)) return false; vistos.add(k); return true; })
  .sort((a, b) => a.n.localeCompare(b.n, 'pt'));
writeFileSync(join(SAIDA, 'referencias.json'), JSON.stringify(referencias));
console.log('Referências do OSM:', referencias.length);

const kb = (f) => Math.round(statSync(join(SAIDA, f)).size / 1024) + ' KB';
console.log(`Usados ${usados} endereços, ${listaLocs.length} localidades, ${listaRuas.length} trechos de via.`);
for (const f of ['localidades.json', 'ruas.json', 'zonas.json', 'municipio.json']) console.log(' ', f, kb(f));
const porZona = {};
listaLocs.forEach((L) => { porZona[L.z] = (porZona[L.z] || 0) + L.c; });
console.log('Endereços por zona:', porZona);
console.log('Zonas:', JSON.parse(readFileSync(join(SAIDA, 'zonas.json'))).features?.map((f) => f.properties));
