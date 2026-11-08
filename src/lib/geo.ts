import type { ZonaId } from '../types';
import { normalizar } from './texto';

export interface Localidade { n: string; z: ZonaId; la: number; lo: number; c: number }
/** [nome, índice da localidade, menor número, maior número, [[número, lat×1e5, lon×1e5], ...]] */
export type Rua = [string, number, number, number, [number, number, number][]];
export interface Referencia { n: string; la: number; lo: number }
type Geometria = { type: string; coordinates?: any; geometries?: Geometria[] };
type Colecao = { type: string; features?: { geometry: Geometria; properties: any }[]; geometries?: Geometria[] };

export interface Geo {
  localidades: Localidade[];
  ruas: Rua[];
  referencias: Referencia[];
  zonas: Colecao;
  municipio: Colecao;
  ruaNorm: string[];
}

export async function carregarGeo(): Promise<Geo> {
  const pega = async (f: string) => {
    const r = await fetch(`/data/${f}.json`);
    if (!r.ok) throw new Error(f);
    return r.json();
  };
  const [localidades, ruas, referencias, zonas, municipio] = await Promise.all(['localidades', 'ruas', 'referencias', 'zonas', 'municipio'].map(pega));
  return { localidades, ruas, referencias, zonas, municipio, ruaNorm: (ruas as Rua[]).map((r) => normalizar(r[0])) };
}

// ---------- ponto dentro do polígono ----------
function dentroDoAnel(x: number, y: number, anel: number[][]): boolean {
  let c = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i], [xj, yj] = anel[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function poligonos(g: Geometria): number[][][][] {
  if (g.type === 'Polygon') return [g.coordinates];
  if (g.type === 'MultiPolygon') return g.coordinates;
  if (g.type === 'GeometryCollection') return (g.geometries || []).flatMap(poligonos);
  return [];
}
function dentroDe(g: Geometria, lon: number, lat: number): boolean {
  return poligonos(g).some((p) => dentroDoAnel(lon, lat, p[0]) && !p.slice(1).some((b) => dentroDoAnel(lon, lat, b)));
}
function geometrias(c: Colecao): Geometria[] {
  if (c.features) return c.features.map((f) => f.geometry);
  return c.geometries || [];
}

export function zonaEm(geo: Geo, lon: number, lat: number): ZonaId | null {
  for (const f of geo.zonas.features || []) if (dentroDe(f.geometry, lon, lat)) return f.properties.zona;
  return null;
}

export function distanciaM(la1: number, lo1: number, la2: number, lo2: number): number {
  const k = Math.cos((la1 * Math.PI) / 180);
  return Math.hypot((la1 - la2) * 111000, (lo1 - lo2) * 111000 * k);
}

// ---------- endereço mais próximo ----------
export interface EnderecoProximo { ruaIdx: number; numero: number; dist: number }

export function enderecoMaisProximo(geo: Geo, lon: number, lat: number): EnderecoProximo | null {
  const k = Math.cos((lat * Math.PI) / 180);
  const la = lat * 1e5, lo = lon * 1e5;
  let melhor: EnderecoProximo | null = null, d = Infinity;
  geo.ruas.forEach((r, i) => {
    for (const p of r[4]) {
      const dd = (p[1] - la) ** 2 + ((p[2] - lo) * k) ** 2;
      if (dd < d) { d = dd; melhor = { ruaIdx: i, numero: p[0], dist: 0 }; }
    }
  });
  if (melhor) (melhor as EnderecoProximo).dist = (Math.sqrt(d) / 1e5) * 111000;
  return melhor;
}

/** O município pela malha, ou a menos de 150 m de um endereço cadastrado (a malha simplificada corta a costa). */
export function dentroDoMunicipio(geo: Geo, lon: number, lat: number): boolean {
  if (geometrias(geo.municipio).some((g) => dentroDe(g, lon, lat))) return true;
  const e = enderecoMaisProximo(geo, lon, lat);
  return !!e && e.dist < 150;
}

export function referenciaProxima(geo: Geo, lon: number, lat: number, maxM = 700): Referencia | null {
  let melhor: Referencia | null = null, d = maxM;
  for (const r of geo.referencias) {
    const dd = distanciaM(lat, lon, r.la, r.lo);
    if (dd < d) { d = dd; melhor = r; }
  }
  return melhor;
}

// ---------- número da casa -> coordenada ----------
export interface PontoNumero { lat: number; lon: number; exato: boolean; fora: boolean }

export function pontoDoNumero(rua: Rua, n: number): PontoNumero | null {
  const pts = rua[4].filter((p) => p[0] > 0);
  const conv = (p: number[]) => ({ lat: p[1] / 1e5, lon: p[2] / 1e5 });
  if (!pts.length) return rua[4].length ? { ...conv(rua[4][0]), exato: false, fora: true } : null;
  const ex = pts.find((p) => p[0] === n);
  if (ex) return { ...conv(ex), exato: true, fora: false };
  // Prefere interpolar entre vizinhos do mesmo lado da rua (par ou ímpar).
  const lado = pts.filter((p) => p[0] % 2 === n % 2);
  const base = lado.length > 1 ? lado : pts;
  let lo: number[] | null = null, hi: number[] | null = null;
  for (const p of base) {
    if (p[0] <= n && (!lo || p[0] > lo[0])) lo = p;
    if (p[0] >= n && (!hi || p[0] < hi[0])) hi = p;
  }
  if (lo && hi && hi[0] !== lo[0]) {
    const t = (n - lo[0]) / (hi[0] - lo[0]);
    return { lat: (lo[1] + (hi[1] - lo[1]) * t) / 1e5, lon: (lo[2] + (hi[2] - lo[2]) * t) / 1e5, exato: false, fora: false };
  }
  return { ...conv((lo || hi)!), exato: false, fora: true };
}

// ---------- busca ----------
const ABREV: Record<string, string> = { r: 'rua', av: 'avenida', tv: 'travessa', trav: 'travessa', est: 'estrada', rod: 'rodovia', pc: 'praca', pca: 'praca', cj: 'conjunto', lot: 'loteamento' };

export function interpretarBusca(texto: string): { palavras: string[]; numero: number | null } {
  let t = normalizar(texto).replace(/\bn[º°o]?\.?\s*(?=\d)/g, ' ').replace(/[.,;#º°-]/g, ' ').trim();
  let numero: number | null = null;
  const m = t.match(/^(.*?)\s+(\d{1,5})\s*[a-z]?$/);
  if (m && m[1].trim()) { t = m[1].trim(); numero = parseInt(m[2], 10); }
  return { palavras: t.split(/\s+/).filter(Boolean).map((w) => ABREV[w] || w), numero };
}

export type Sugestao =
  | { tipo: 'rua'; ruaIdx: number; numero: number | null; cabe: boolean }
  | { tipo: 'localidade'; idx: number }
  | { tipo: 'referencia'; idx: number };

export function buscar(geo: Geo, texto: string, limite = 12): Sugestao[] {
  if (texto.trim().length < 2) return [];
  const { palavras, numero } = interpretarBusca(texto);
  if (!palavras.length) return [];
  const casa = (n: string) => palavras.every((w) => n.includes(w));
  const out: Sugestao[] = [];
  const posicao = (n: string) => n.indexOf(palavras[0]);

  if (numero == null) {
    geo.localidades
      .map((l, idx) => ({ idx, n: normalizar(l.n) }))
      .filter((x) => casa(x.n))
      .sort((a, b) => posicao(a.n) - posicao(b.n))
      .slice(0, 4)
      .forEach((x) => out.push({ tipo: 'localidade', idx: x.idx }));
    const jaTem = new Set(geo.localidades.map((l) => normalizar(l.n)));
    geo.referencias
      .map((r, idx) => ({ idx, n: normalizar(r.n) }))
      .filter((x) => casa(x.n) && !jaTem.has(x.n))
      .sort((a, b) => posicao(a.n) - posicao(b.n))
      .slice(0, 3)
      .forEach((x) => out.push({ tipo: 'referencia', idx: x.idx }));
  }

  const ruas: number[] = [];
  geo.ruaNorm.forEach((n, i) => { if (casa(n)) ruas.push(i); });
  const cabe = (i: number) => numero != null && numero >= geo.ruas[i][2] && numero <= geo.ruas[i][3];
  ruas.sort((a, b) =>
    Number(cabe(b)) - Number(cabe(a)) ||
    posicao(geo.ruaNorm[a]) - posicao(geo.ruaNorm[b]) ||
    geo.ruaNorm[a].length - geo.ruaNorm[b].length ||
    geo.ruas[b][4].length - geo.ruas[a][4].length,
  );
  ruas.slice(0, Math.max(0, limite - out.length)).forEach((ruaIdx) => out.push({ tipo: 'rua', ruaIdx, numero, cabe: cabe(ruaIdx) }));
  return out;
}

export function limitesDaRua(rua: Rua): [[number, number], [number, number]] {
  let a = 90, b = 180, c = -90, d = -180;
  for (const p of rua[4]) {
    const la = p[1] / 1e5, lo = p[2] / 1e5;
    a = Math.min(a, la); b = Math.min(b, lo); c = Math.max(c, la); d = Math.max(d, lo);
  }
  return [[b, a], [d, c]];
}

/** Limites de uma localidade, a partir de todos os seus endereços. */
export function limitesDaLocalidade(geo: Geo, idx: number): [[number, number], [number, number]] {
  let a = 90, b = 180, c = -90, d = -180;
  for (const r of geo.ruas) {
    if (r[1] !== idx) continue;
    for (const p of r[4]) {
      const la = p[1] / 1e5, lo = p[2] / 1e5;
      a = Math.min(a, la); b = Math.min(b, lo); c = Math.max(c, la); d = Math.max(d, lo);
    }
  }
  return [[b, a], [d, c]];
}
