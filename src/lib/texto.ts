import { NOME_CATEGORIA } from '../dados/constantes';
import type { Problema } from '../types';

export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function dataHora(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

export function diasDesde(iso: string, agora = Date.now()): number {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 86400000));
}

export function tempoAberto(p: Pick<Problema, 'criado_em' | 'status' | 'atualizado_em'>): string {
  if (p.status === 'resolvido') return 'Resolvido';
  const d = diasDesde(p.criado_em);
  if (d === 0) return 'Apontado hoje';
  return d === 1 ? 'Aberto há 1 dia' : `Aberto há ${d} dias`;
}

export const enderecoCurto = (p: Pick<Problema, 'via' | 'numero'>) => (p.numero ? `${p.via}, ${p.numero}` : `${p.via}, s/n`);

export function esperaTxt(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.ceil((ms % 3600000) / 60000);
  return h ? `${h}h ${m}min` : `${m} min`;
}

export function limiteTxt(n: number, horas: number): string {
  return `${n === 1 ? '1 problema' : `${n} problemas`} ${horas === 1 ? 'por hora' : `a cada ${horas} horas`}`;
}

export const nomeValido = (n: string) => n.length >= 2 && n.length <= 40 && !/[<>@]/.test(n);
export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function mensagemCobranca(p: Problema): string {
  const tipo = NOME_CATEGORIA[p.categoria] || 'Problema';
  const local = `${enderecoCurto(p)}, ${p.localidade}${p.referencia ? ` (${p.referencia})` : ''}`;
  const apoio = p.apoios > 1 ? `${p.apoios} apoios de moradores` : '1 apoio de morador';
  return [
    'Olá! Sou morador(a) de Extremoz/RN e peço providências sobre um problema na cidade:',
    '',
    `"${p.titulo}" (${tipo})`,
    `Local: ${local}.`,
    `Registrado em ${dataCurta(p.criado_em)}.${p.protocolo ? ` Protocolo: ${p.protocolo}.` : ''}`,
    '',
    `"${p.descricao.slice(0, 400)}"`,
    '',
    `O problema tem ${apoio} no Melhora Extremoz.`,
    `Veja no mapa: ${linkProblema(p.id)}`,
    '',
    'Obrigado(a)!',
  ].join('\n');
}

export const linkProblema = (id: string) => `${location.origin}/problema/${id}`;

function celulaCsv(v: unknown): string {
  let s = String(v ?? '');
  // Evita que planilhas interpretem o texto de moradores como fórmula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function problemasParaCsv(lista: Problema[]): string {
  const cab = ['Título', 'Tipo', 'Status', 'Via', 'Número', 'Referência', 'Localidade', 'Apoios', 'Comentários', 'Protocolo', 'Latitude', 'Longitude', 'Publicado em', 'Link'];
  const linhas = lista.map((p) => [p.titulo, NOME_CATEGORIA[p.categoria] || p.categoria, p.status, p.via, p.numero, p.referencia, p.localidade, p.apoios, p.comentarios, p.protocolo, p.lat, p.lon, dataHora(p.criado_em), linkProblema(p.id)]);
  // BOM para o Excel reconhecer os acentos.
  return '﻿' + [cab, ...linhas].map((l) => l.map(celulaCsv).join(';')).join('\r\n');
}

export function baixarArquivo(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8') {
  const u = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = u;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}

export async function copiar(txt: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = txt;
    document.body.appendChild(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* sem suporte */ }
    t.remove();
    return ok;
  }
}
