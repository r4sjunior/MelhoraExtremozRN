import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MLMap, Marker, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// O empacotador não enxerga o worker do MapLibre sozinho: a URL precisa ser informada.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { COR_ANDAMENTO, COR_RESOLVIDO, COR_ZONA, CORES_APOIO, NOME_CATEGORIA, faixaDeApoio } from '../dados/constantes';
import type { Geo, Rua } from '../lib/geo';
import { enderecoCurto } from '../lib/texto';
import type { Problema, ZonaId } from '../types';

export interface MapaApi {
  voar(lon: number, lat: number, zoom?: number): void;
  enquadrar(b: [[number, number], [number, number]], maxZoom?: number): void;
  visaoGeral(): void;
  destacarRua(rua: Rua | null): void;
  minhaPosicao(lon: number, lat: number): void;
  centro(): { lon: number; lat: number; zoom: number };
  redimensionar(): void;
}

interface Props {
  geo: Geo | null;
  problemas: Problema[];
  selecionado: string | null;
  rascunho: { lat: number; lon: number } | null;
  margemInferior: number;
  apiRef: Ref<MapaApi>;
  aoClicar(lon: number, lat: number, zoom: number): void;
  aoAbrir(id: string): void;
  aoArrastar(lon: number, lat: number): void;
}

maplibregl.setWorkerUrl(new URL(workerUrl, location.origin).href);

const LIMITES: [[number, number], [number, number]] =[[-35.37, -5.76], [-35.17, -5.6]];
const FONTES = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const ZOOM_PINOS = 13.5;

/** Mapa-base vetorial do OpenFreeMap, sem o que polui; se falhar, usa o raster do OpenStreetMap. */
async function carregarEstilo(): Promise<StyleSpecification> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch('https://tiles.openfreemap.org/styles/liberty', { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(String(r.status));
    const st = (await r.json()) as StyleSpecification;
    const fora = /^(poi|building-3d|airport|aeroway|road_one_way|highway-shield|road_shield|boundary|label_country|label_state|natural_earth)/;
    st.layers = st.layers.filter((l) => !fora.test(l.id));
    return st;
  } catch {
    return {
      version: 8,
      glyphs: FONTES,
      sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap' } },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    };
  }
}

function corDe(p: Pick<Problema, 'status' | 'apoios'>) {
  if (p.status === 'resolvido') return COR_RESOLVIDO;
  if (p.status === 'andamento') return COR_ANDAMENTO;
  return CORES_APOIO[faixaDeApoio(p.apoios)];
}

/** Desenha um alfinete colorido e o registra como imagem do mapa. */
function registrarPino(map: MLMap, id: string, cor: string) {
  const esc = 2, w = 40, h = 52;
  const c = document.createElement('canvas');
  c.width = w * esc;
  c.height = h * esc;
  const g = c.getContext('2d')!;
  g.scale(esc, esc);
  g.beginPath();
  g.moveTo(20, 50);
  g.bezierCurveTo(14, 38, 2, 30, 2, 19);
  g.arc(20, 19, 18, Math.PI, 0);
  g.bezierCurveTo(38, 30, 26, 38, 20, 50);
  g.closePath();
  g.fillStyle = cor;
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = '#ffffff';
  g.stroke();
  map.addImage(id, g.getImageData(0, 0, c.width, c.height), { pixelRatio: esc });
}

const CORES_PINO: [string, string][] = [
  ...CORES_APOIO.map((c, i): [string, string] => [`pino-${i}`, c]),
  ['pino-res', COR_RESOLVIDO],
  ['pino-and', COR_ANDAMENTO],
];
function pinoDe(p: Problema) {
  if (p.status === 'resolvido') return 'pino-res';
  if (p.status === 'andamento') return 'pino-and';
  return `pino-${faixaDeApoio(p.apoios)}`;
}

function aneisDoMunicipio(geo: Geo): number[][][] {
  const pega = (g: any): number[][][] => {
    if (g.type === 'Polygon') return [g.coordinates[0]];
    if (g.type === 'MultiPolygon') return g.coordinates.map((p: number[][][]) => p[0]);
    if (g.type === 'GeometryCollection') return g.geometries.flatMap(pega);
    return [];
  };
  const m = geo.municipio as any;
  return m.features ? m.features.flatMap((f: any) => pega(f.geometry)) : (m.geometries || []).flatMap(pega);
}

function geojsonProblemas(lista: Problema[]) {
  return {
    type: 'FeatureCollection' as const,
    features: lista.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
      properties: { id: p.id, apoios: p.apoios, cor: corDe(p), pino: pinoDe(p), escala: Math.min(1.25, 0.72 + Math.log2(p.apoios + 1) * 0.08), titulo: p.titulo, cat: NOME_CATEGORIA[p.categoria] || 'Problema', local: `${enderecoCurto(p)} · ${p.localidade}` },
    })),
  };
}

export default function MapView({ geo, problemas, selecionado, rascunho, margemInferior, apiRef, aoClicar, aoAbrir, aoArrastar }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MLMap | null>(null);
  const pronto = useRef(false);
  const [estaPronto, setPronto] = useState(false);
  const [erro, setErro] = useState(false);
  const marcador = useRef<Marker | null>(null);
  const eu = useRef<Marker | null>(null);
  const cb = useRef({ aoClicar, aoAbrir, aoArrastar });
  cb.current = { aoClicar, aoAbrir, aoArrastar };

  useImperativeHandle(apiRef, () => ({
    voar(lon, lat, zoom) { mapa.current?.easeTo({ center: [lon, lat], zoom: zoom ?? Math.max(mapa.current.getZoom(), 16), duration: 500 }); },
    enquadrar(b, maxZoom = 16) { mapa.current?.fitBounds(b, { padding: 50, maxZoom, duration: 500 }); },
    visaoGeral() { mapa.current?.fitBounds(LIMITES, { padding: 16, duration: 500 }); },
    destacarRua(rua) {
      const s = mapa.current?.getSource('rua-destaque') as GeoJSONSource | undefined;
      s?.setData({ type: 'FeatureCollection', features: (rua?.[4] || []).map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p[2] / 1e5, p[1] / 1e5] } })) });
    },
    minhaPosicao(lon, lat) {
      const m = mapa.current;
      if (!m) return;
      if (!eu.current) {
        const el = document.createElement('div');
        el.className = 'ponto-eu';
        eu.current = new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(m);
      } else eu.current.setLngLat([lon, lat]);
    },
    centro() {
      const m = mapa.current!;
      const c = m.getCenter();
      return { lon: c.lng, lat: c.lat, zoom: m.getZoom() };
    },
    redimensionar() { mapa.current?.resize(); },
  }), []);

  // Cria o mapa uma vez.
  useEffect(() => {
    let vivo = true;
    let criado: MLMap | null = null;
    (async () => {
      const style = await carregarEstilo();
      if (!vivo || !caixa.current) return;
      try {
        criado = new maplibregl.Map({
          container: caixa.current,
          style,
          bounds: LIMITES,
          fitBoundsOptions: { padding: 16 },
          minZoom: 9.5,
          maxZoom: 19,
          maxBounds: [[-35.75, -6.0], [-34.8, -5.35]],
          attributionControl: { compact: true, customAttribution: 'Endereços e setores: IBGE, Censo 2022' },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
      } catch (e) {
        console.error(e);
        setErro(true);
        return;
      }
      const map: MLMap = criado!;
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      mapa.current = map;
      map.on('load', () => {
        CORES_PINO.forEach(([id, cor]) => registrarPino(map, id, cor));
        const vazio = { type: 'FeatureCollection' as const, features: [] };
        map.addSource('problemas', { type: 'geojson', data: vazio });
        map.addSource('rua-destaque', { type: 'geojson', data: vazio });
        map.addLayer({ id: 'rua-destaque', type: 'circle', source: 'rua-destaque', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3, 18, 8], 'circle-color': '#0e6b5a', 'circle-opacity': 0.5 } });
        map.addLayer({
          id: 'prob-circulos', type: 'circle', source: 'problemas', maxzoom: ZOOM_PINOS,
          paint: { 'circle-color': ['get', 'cor'], 'circle-radius': ['+', 5, ['*', 5, ['-', ['get', 'escala'], 0.72]], ['*', 9, ['-', ['get', 'escala'], 0.72]]], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 },
        });
        map.addLayer({
          id: 'prob-selecionado', type: 'circle', source: 'problemas', filter: ['==', ['get', 'id'], ''],
          paint: { 'circle-radius': 24, 'circle-color': '#f4b41a', 'circle-opacity': 0.35, 'circle-stroke-color': '#f4b41a', 'circle-stroke-width': 2 },
        });
        map.addLayer({
          id: 'prob-pinos', type: 'symbol', source: 'problemas', minzoom: ZOOM_PINOS,
          layout: {
            'icon-image': ['get', 'pino'], 'icon-size': ['get', 'escala'], 'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'text-allow-overlap': true,
            'symbol-sort-key': ['get', 'apoios'],
            'text-field': ['to-string', ['get', 'apoios']], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-anchor': 'bottom', 'text-offset': ['literal', [0, -1.45]],
          },
          paint: { 'text-color': '#ffffff' },
        });
        const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 34, maxWidth: '260px', className: 'pop-prob' });
        for (const camada of ['prob-pinos', 'prob-circulos']) {
          map.on('mouseenter', camada, (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const f = e.features?.[0];
            if (!f || !matchMedia('(hover: hover)').matches) return;
            const p = f.properties as any;
            const div = document.createElement('div');
            const t = document.createElement('b'); t.textContent = p.titulo;
            const s = document.createElement('small'); s.textContent = `${p.cat} · ${p.apoios} apoio${p.apoios > 1 ? 's' : ''}`;
            const l = document.createElement('small'); l.textContent = p.local;
            div.append(t, s, l);
            pop.setLngLat((f.geometry as any).coordinates).setDOMContent(div).addTo(map);
          });
          map.on('mouseleave', camada, () => { map.getCanvas().style.cursor = ''; pop.remove(); });
        }
        map.on('click', (e) => {
          const d = 7;
          const achados = map.queryRenderedFeatures(
            [[e.point.x - d, e.point.y - d], [e.point.x + d, e.point.y + d]],
            { layers: ['prob-pinos', 'prob-circulos'] },
          );
          if (achados.length) {
            pop.remove();
            cb.current.aoAbrir((achados[achados.length - 1].properties as any).id);
          } else cb.current.aoClicar(e.lngLat.lng, e.lngLat.lat, map.getZoom());
        });
        pronto.current = true;
        setPronto(true);
      });
    })();
    return () => {
      vivo = false;
      pronto.current = false;
      marcador.current = null;
      eu.current = null;
      mapa.current = null;
      criado?.remove();
    };
  }, []);

  // Contorno, zonas e nomes, assim que mapa e dados estiverem prontos.
  useEffect(() => {
    const map = mapa.current;
    if (!estaPronto || !map || !geo || map.getSource('zonas')) return;
    const antes = 'rua-destaque';
    const aneis = aneisDoMunicipio(geo);
    map.addSource('mascara', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], ...aneis] } },
    });
    map.addLayer({ id: 'mascara', type: 'fill', source: 'mascara', paint: { 'fill-color': '#f6f3ea', 'fill-opacity': 0.72 } }, antes);
    map.addSource('zonas', { type: 'geojson', data: geo.zonas as any });
    const corZona: any = ['match', ['get', 'zona'], ...(Object.entries(COR_ZONA) as [ZonaId, string][]).flat(), '#999'];
    map.addLayer({ id: 'zonas-fill', type: 'fill', source: 'zonas', paint: { 'fill-color': corZona, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.2, 13.5, 0] } }, antes);
    map.addLayer({ id: 'zonas-linha', type: 'line', source: 'zonas', paint: { 'line-color': '#0a4f43', 'line-width': 1, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.5, 14, 0.12] } }, antes);

    const centros = new Map<string, { la: number; lo: number; c: number }>();
    geo.localidades.forEach((l) => {
      const x = centros.get(l.z) || { la: 0, lo: 0, c: 0 };
      x.la += l.la * l.c; x.lo += l.lo * l.c; x.c += l.c;
      centros.set(l.z, x);
    });
    const nomes = new Map((geo.zonas.features || []).map((f) => [f.properties.zona, f.properties.nome]));
    map.addSource('rotulos-zona', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [...centros].map(([z, x]) => ({ type: 'Feature', properties: { n: nomes.get(z) || z }, geometry: { type: 'Point', coordinates: [x.lo / x.c, x.la / x.c] } })) },
    });
    map.addLayer({
      id: 'rotulos-zona', type: 'symbol', source: 'rotulos-zona', maxzoom: 12.6,
      layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-max-width': 8 },
      paint: { 'text-color': '#0a4f43', 'text-halo-color': '#fff', 'text-halo-width': 1.6 },
    }, antes);
    // Localidades do IBGE e referências do OpenStreetMap, sem repetir nomes.
    const vistos = new Set<string>();
    const rotulos: { n: string; la: number; lo: number; p: number }[] = [];
    geo.localidades.forEach((l) => { vistos.add(l.n.toLowerCase()); rotulos.push({ n: l.n, la: l.la, lo: l.lo, p: l.c }); });
    geo.referencias.forEach((r) => { if (!vistos.has(r.n.toLowerCase())) rotulos.push({ n: r.n, la: r.la, lo: r.lo, p: 1 }); });
    map.addSource('rotulos-local', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: rotulos.map((r) => ({ type: 'Feature', properties: { n: r.n, p: r.p }, geometry: { type: 'Point', coordinates: [r.lo, r.la] } })) },
    });
    map.addLayer({
      id: 'rotulos-local', type: 'symbol', source: 'rotulos-local', minzoom: 12.6,
      layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-max-width': 8, 'symbol-sort-key': ['-', 0, ['get', 'p']] },
      paint: { 'text-color': '#31544d', 'text-halo-color': '#fff', 'text-halo-width': 1.4 },
    }, antes);
  }, [estaPronto, geo]);

  useEffect(() => {
    if (!estaPronto) return;
    (mapa.current?.getSource('problemas') as GeoJSONSource | undefined)?.setData(geojsonProblemas(problemas));
  }, [estaPronto, problemas]);

  useEffect(() => {
    if (!estaPronto) return;
    mapa.current?.setFilter('prob-selecionado', ['==', ['get', 'id'], selecionado || '']);
  }, [estaPronto, selecionado]);

  useEffect(() => {
    mapa.current?.setPadding({ top: 0, left: 0, right: 0, bottom: margemInferior });
  }, [margemInferior, estaPronto]);

  // Alfinete arrastável do problema em rascunho.
  useEffect(() => {
    const map = mapa.current;
    if (!estaPronto || !map) return;
    if (!rascunho) {
      marcador.current?.remove();
      marcador.current = null;
      return;
    }
    if (!marcador.current) {
      const el = document.createElement('div');
      el.className = 'pino-rascunho';
      el.setAttribute('aria-label', 'Ponto do problema: arraste para ajustar');
      const novo = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' }).setLngLat([rascunho.lon, rascunho.lat]).addTo(map);
      novo.on('dragend', () => {
        const p = novo.getLngLat();
        cb.current.aoArrastar(p.lng, p.lat);
      });
      marcador.current = novo;
    } else marcador.current.setLngLat([rascunho.lon, rascunho.lat]);
  }, [estaPronto, rascunho]);

  if (erro) return <div className="mapa-erro">Seu navegador não conseguiu abrir o mapa (WebGL desligado). Atualize o navegador ou tente em outro aparelho. As abas Prioridades e Cobrar continuam funcionando.</div>;
  return <div ref={caixa} className="mapa" role="application" aria-label="Mapa de Extremoz" />;
}
