import { describe, expect, it } from 'vitest';
import { buscar, interpretarBusca, pontoDoNumero, type Geo, type Rua } from './geo';
import { problemasParaCsv } from './texto';
import type { Problema } from '../types';

const rua: Rua = ['Rua Teste', 0, 2, 100, [[2, -570000, -3530000], [50, -570100, -3530100], [100, -570200, -3530200], [51, -570300, -3530300], [99, -570400, -3530400]]];
const geo = {
  localidades: [{ n: 'Centro', z: 'sede', la: -5.7, lo: -35.3, c: 10 }, { n: 'Genipabu', z: 'genipabu', la: -5.69, lo: -35.21, c: 10 }],
  ruas: [rua, ['Avenida São João', 1, 1, 10, [[1, -570000, -3520000]]]],
  ruaNorm: ['rua teste', 'avenida sao joao'],
  referencias: [{ n: 'Genipabu de Dentro', la: -5.7, lo: -35.22 }, { n: 'Centro', la: -5.7, lo: -35.3 }],
  zonas: { type: 'FeatureCollection', features: [] },
  municipio: { type: 'GeometryCollection', geometries: [] },
} as unknown as Geo;

describe('interpretarBusca', () => {
  it('separa rua e número e expande abreviações', () => {
    expect(interpretarBusca('Av. São João, 10')).toEqual({ palavras: ['avenida', 'sao', 'joao'], numero: 10 });
    expect(interpretarBusca('r felipe camarão nº 139')).toEqual({ palavras: ['rua', 'felipe', 'camarao'], numero: 139 });
    expect(interpretarBusca('Sport Clube')).toEqual({ palavras: ['sport', 'clube'], numero: null });
  });
});

describe('pontoDoNumero', () => {
  it('acha o número exato', () => {
    expect(pontoDoNumero(rua, 50)).toMatchObject({ lat: -5.701, exato: true, fora: false });
  });
  it('interpola entre vizinhos do mesmo lado', () => {
    const p = pontoDoNumero(rua, 75)!;
    expect(p.exato).toBe(false);
    expect(p.fora).toBe(false);
    expect(p.lat).toBeCloseTo(-5.7035, 4);
  });
  it('marca número fora do trecho', () => {
    expect(pontoDoNumero(rua, 500)).toMatchObject({ fora: true });
  });
});

describe('buscar', () => {
  it('encontra localidades, referências e ruas sem acento', () => {
    const r = buscar(geo, 'genipabu');
    expect(r[0]).toMatchObject({ tipo: 'localidade', idx: 1 });
    expect(r[1]).toMatchObject({ tipo: 'referencia', idx: 0 });
    expect(buscar(geo, 'sao joao')[0]).toMatchObject({ tipo: 'rua', ruaIdx: 1 });
  });
  it('com número, traz só ruas e indica se cabe no trecho', () => {
    expect(buscar(geo, 'rua teste 50')).toEqual([{ tipo: 'rua', ruaIdx: 0, numero: 50, cabe: true }]);
    expect(buscar(geo, 'rua teste 500')[0]).toMatchObject({ cabe: false });
  });
  it('não duplica referência com o mesmo nome de localidade', () => {
    expect(buscar(geo, 'centro').filter((s) => s.tipo === 'referencia')).toHaveLength(0);
  });
});

describe('problemasParaCsv', () => {
  it('neutraliza fórmulas e escapa aspas', () => {
    (globalThis as any).location = { origin: 'https://x' };
    const csv = problemasParaCsv([{ id: '1', titulo: '=HACK()', categoria: 'buraco', status: 'aberto', via: 'Rua "A"', numero: null, referencia: null, localidade: 'Centro', apoios: 1, comentarios: 0, protocolo: null, lat: 1, lon: 2, criado_em: '2026-01-01T00:00:00Z' } as unknown as Problema]);
    expect(csv).toContain(`"'=HACK()"`);
    expect(csv).toContain('"Rua ""A"""');
  });
});
