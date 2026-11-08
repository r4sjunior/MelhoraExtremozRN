// Testa schema.sql num Postgres real em memória (PGlite), com um esqueleto dos esquemas auth e storage.
// Uso: npm run test:sql
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const AQUI = dirname(fileURLToPath(import.meta.url));
const db = new PGlite();

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text);
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema auth, storage, public to anon, authenticated, service_role;
  grant select, insert, delete on storage.objects to authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
`);
await db.exec(readFileSync(join(AQUI, '..', 'schema.sql'), 'utf8'));

let ok = 0, falhas = 0;
function passou(nome, cond, extra = '') {
  if (cond) { ok++; console.log('  ok  ', nome); } else { falhas++; console.log('  FALHA', nome, extra); }
}

// Executa como um usuário (ou anônimo), como o PostgREST faz.
async function como(uid, fn, claims = {}) {
  const papel = uid ? 'authenticated' : 'anon';
  const jwt = JSON.stringify({ sub: uid || '', role: papel, ...claims }).replace(/'/g, "''");
  await db.exec(`set request.jwt.claims = '${jwt}'; set role ${papel};`);
  try { return await fn(); } finally { await db.exec(`reset role; set request.jwt.claims = '';`); }
}
const q = (s, p) => db.query(s, p);
async function erro(fn) {
  try { await fn(); return null; } catch (e) { return e.message; }
}

async function novoUsuario(email) {
  const r = await q(`insert into auth.users (email) values ($1) returning id`, [email]);
  return r.rows[0].id;
}
const [ana, bia, caio, dora, admin] = await Promise.all(['ana', 'bia', 'caio', 'dora', 'admin'].map((n) => novoUsuario(n + '@x.com')));
await q(`insert into public.admins values ($1)`, [admin]);
// Contas com mais de 24 h, exceto dora (recém-criada)
await q(`update public.perfis set criado_em = now() - interval '3 days' where id <> $1`, [dora]);

const pub = (uid, extra = {}) => {
  const b = { categoria: 'buraco', titulo: 'Buraco na rua', descricao: 'Buraco grande perto do portão', via: 'Rua Felipe Camarão', localidade: 'Centro', zona: 'sede', lat: -5.70, lon: -35.30, fotos: [], ...extra };
  return q(
    `insert into public.problemas (autor_id,categoria,titulo,descricao,via,localidade,zona,lat,lon,fotos) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
    [extra.autor ?? uid, b.categoria, b.titulo, b.descricao, b.via, b.localidade, b.zona, b.lat, b.lon, b.fotos],
  );
};

console.log('Publicação');
const p1 = (await como(ana, () => pub(ana))).rows[0];
passou('publica e já conta 1 apoio', p1.apoios === 1 && p1.status === 'aberto');
passou('cria perfil automaticamente', (await q(`select nome from public.perfis where id=$1`, [ana])).rows[0].nome === 'Morador(a)');
passou('anônimo não publica', !!(await como(null, () => erro(() => pub(ana)))));
passou('não publica em nome de outra pessoa', !!(await como(bia, () => erro(() => pub(bia, { autor: ana })))));
passou('rejeita ponto fora da cidade', !!(await como(bia, () => erro(() => pub(bia, { lat: -5.9 })))));
passou('rejeita título curto', !!(await como(bia, () => erro(() => pub(bia, { titulo: 'x' })))));
passou('rejeita foto de outra pasta', !!(await como(bia, () => erro(() => pub(bia, { fotos: [ana + '/abcdef.jpg'] })))));
const p2 = (await como(ana, () => pub(ana, { titulo: 'Segundo buraco' }))).rows[0];
const lim = await como(ana, () => erro(() => pub(ana, { titulo: 'Terceiro buraco' })));
passou('aplica limite de 2 por hora', /Limite atingido/.test(lim || ''), lim);
await como(ana, () => q(`delete from public.problemas where id=$1`, [p2.id]));
passou('excluir não devolve a cota', /Limite atingido/.test((await como(ana, () => erro(() => pub(ana, { titulo: 'Quarto buraco' })))) || ''));
passou('autor não altera status direto', !!(await como(ana, () => erro(() => q(`update public.problemas set status='resolvido' where id=$1`, [p1.id])))));
passou('autor não infla apoios', !!(await como(ana, () => erro(() => q(`update public.problemas set apoios=99 where id=$1`, [p1.id])))));

console.log('Apoios e comentários');
await como(bia, () => q(`insert into public.apoios (problema_id,user_id) values ($1,$2)`, [p1.id, bia]));
const ap = async () => (await q(`select apoios,comentarios,denuncias_pendentes,graves_pendentes,status from public.problemas where id=$1`, [p1.id])).rows[0];
passou('apoio soma', (await ap()).apoios === 2);
passou('não apoia duas vezes', !!(await como(bia, () => erro(() => q(`insert into public.apoios (problema_id,user_id) values ($1,$2)`, [p1.id, bia])))));
passou('autor não apoia o próprio', !!(await como(ana, () => erro(() => q(`insert into public.apoios (problema_id,user_id) values ($1,$2)`, [p1.id, ana])))));
passou('não apoia por outra pessoa', !!(await como(bia, () => erro(() => q(`insert into public.apoios (problema_id,user_id) values ($1,$2)`, [p1.id, caio])))));
passou('apoios alheios são privados', (await como(caio, () => q(`select * from public.apoios`))).rows.length === 0);
await como(bia, () => q(`delete from public.apoios where problema_id=$1 and user_id=$2`, [p1.id, bia]));
passou('retirar apoio subtrai', (await ap()).apoios === 1);
await como(bia, () => q(`insert into public.apoios (problema_id,user_id) values ($1,$2)`, [p1.id, bia]));
await como(bia, () => q(`insert into public.comentarios (problema_id,autor_id,texto) values ($1,$2,'Piorou esta semana')`, [p1.id, bia]));
passou('comentário conta', (await ap()).comentarios === 1);
passou('anônimo lê comentários', (await como(null, () => q(`select * from public.comentarios`))).rows.length === 1);
passou('anônimo não lê e-mail nem dados privados', !!(await como(null, () => erro(() => q(`select * from public.mensagens`)))));

console.log('Denúncias e moderação');
passou('conta nova não denuncia', /Contas novas/.test((await como(dora, () => erro(() => q(`insert into public.denuncias (problema_id,user_id,motivo) values ($1,$2,'Duplicado')`, [p1.id, dora])))) || ''));
passou('autor não denuncia o próprio', !!(await como(ana, () => erro(() => q(`insert into public.denuncias (problema_id,user_id,motivo) values ($1,$2,'Duplicado')`, [p1.id, ana])))));
const den = (uid, m, pid = p1.id) => como(uid, () => q(`insert into public.denuncias (problema_id,user_id,motivo) values ($1,$2,$3)`, [pid, uid, m]));
await den(bia, 'Duplicado');
await den(caio, 'Informação falsa');
const vis = (uid) => como(uid, () => q(`select id from public.problemas where id=$1`, [p1.id]));
passou('2 denúncias: continua visível', (await vis(null)).rows.length === 1);
await q(`update public.perfis set criado_em = now() - interval '3 days'`);
await den(dora, 'Conteúdo ofensivo');
passou('3 denúncias: sai do mapa público', (await vis(null)).rows.length === 0);
passou('autor ainda vê a própria publicação', (await vis(ana)).rows.length === 1);
passou('admin vê', (await vis(admin)).rows.length === 1);
passou('não-admin não modera', /restrita/.test((await como(bia, () => erro(() => q(`select public.moderar_problema($1,'manter')`, [p1.id])))) || ''));
await como(admin, () => q(`select public.moderar_problema($1,'manter')`, [p1.id]));
passou('manter publicada devolve ao mapa', (await vis(null)).rows.length === 1);
await q(`update public.regras set publicacoes_por_janela = 50`);
const p3 = (await como(bia, () => pub(bia, { titulo: 'Problema de teste', fotos: [bia + '/abc123.jpg'] }))).rows[0];
await den(caio, 'Conteúdo sexual, violento ou ilegal', p3.id);
passou('denúncia grave oculta na hora', (await como(null, () => q(`select id from public.problemas where id=$1`, [p3.id]))).rows.length === 0);
await como(admin, () => q(`select public.moderar_problema($1,'remover')`, [p3.id]));
const rem = (await q(`select * from public.problemas where id=$1`, [p3.id])).rows[0];
passou('remover apaga texto e fotos', rem.status === 'removido' && rem.titulo === '' && rem.descricao === '' && rem.fotos.length === 0);

console.log('Status, protocolo e histórico');
await como(admin, () => q(`select public.mudar_status($1,'andamento','Equipe no local')`, [p1.id]));
await como(ana, () => q(`select public.definir_protocolo($1,'2026-001')`, [p1.id]));
passou('outra pessoa não define protocolo', !!(await como(caio, () => erro(() => q(`select public.definir_protocolo($1,'x')`, [p1.id])))));
const hist = (await como(null, () => q(`select status,protocolo,nota from public.historico_status where problema_id=$1 order by id`, [p1.id]))).rows;
passou('histórico público registra tudo', hist.length === 3 && hist[1].nota === 'Equipe no local' && hist[2].protocolo === '2026-001', JSON.stringify(hist));
passou('não-admin não muda status', !!(await como(bia, () => erro(() => q(`select public.mudar_status($1,'resolvido')`, [p1.id])))));

console.log('Suspensão');
await como(admin, () => q(`select public.definir_suspensao($1,true)`, [caio]));
passou('suspenso não comenta', /suspensa/.test((await como(caio, () => erro(() => q(`insert into public.comentarios (problema_id,autor_id,texto) values ($1,$2,'teste aqui')`, [p1.id, caio])))) || ''));
passou('suspenso não apoia', /suspensa/.test((await como(caio, () => erro(() => q(`insert into public.apoios (problema_id,user_id) values ($1,$2)`, [p1.id, caio])))) || ''));
await como(admin, () => q(`select public.definir_suspensao($1,false)`, [caio]));

console.log('Administração');
await q(`insert into auth.mfa_factors (user_id,status) values ($1,'verified')`, [admin]);
passou('com 2 etapas cadastradas, aal1 não é admin', (await como(admin, () => q(`select public.is_admin() a`))).rows[0].a === false);
passou('com 2 etapas confirmadas, aal2 é admin', (await como(admin, () => q(`select public.is_admin() a`), { aal: 'aal2' })).rows[0].a === true);
await q(`delete from auth.mfa_factors`);
passou('painel de acessos é restrito', /restrita/.test((await como(bia, () => erro(() => q(`select public.painel_acessos(30)`)))) || ''));
passou('lista de usuários é restrita', /restrita/.test((await como(bia, () => erro(() => q(`select * from public.admin_usuarios()`)))) || ''));
passou('admin lista usuários', (await como(admin, () => q(`select * from public.admin_usuarios()`))).rows.length === 5);
passou('não-admin não muda regras', (await como(bia, () => q(`update public.regras set janela_horas=9 returning id`))).rows.length === 0);
await como(null, () => q(`select public.registrar_visita('s1','v1','mapa','celular','WhatsApp')`));
await como(null, () => q(`select public.registrar_visita('s1','v1','cobrar','celular','WhatsApp')`));
const ac = (await como(admin, () => q(`select public.painel_acessos(30) r`))).rows[0].r;
passou('estatísticas agregadas', ac.visitas === 1 && ac.paginas.cobrar === 1, JSON.stringify(ac));
passou('anônimo não lê visitas', !!(await como(null, () => erro(() => q(`select * from public.visitas`)))));

console.log('Mensagens');
await como(null, () => q(`select public.enviar_mensagem('x@y.com','Assunto','Mensagem de teste')`));
passou('anônimo envia mensagem', (await q(`select count(*)::int n from public.mensagens`)).rows[0].n === 1);
await como(null, () => q(`select public.enviar_mensagem('x@y.com','Assunto','Mensagem de teste')`));
await como(null, () => q(`select public.enviar_mensagem('x@y.com','Assunto','Mensagem de teste')`));
passou('limita mensagens por e-mail', /Muitas mensagens/.test((await como(null, () => erro(() => q(`select public.enviar_mensagem('x@y.com','Assunto','Mensagem de teste')`)))) || ''));
passou('rejeita e-mail inválido', !!(await como(null, () => erro(() => q(`select public.enviar_mensagem('nada','Assunto','Mensagem de teste')`)))));

console.log('Fotos');
const foto = (uid, nome) => como(uid, () => q(`insert into storage.objects (bucket_id,name) values ('fotos',$1)`, [nome]));
await foto(bia, bia + '/foto01.jpg');
passou('envia na própria pasta', (await q(`select count(*)::int n from storage.objects`)).rows[0].n === 1);
passou('não envia na pasta alheia', !!(await erro(() => foto(bia, ana + '/foto02.jpg'))));

console.log('Excluir conta');
const antes = (await q(`select comentarios, apoios from public.problemas where id=$1`, [p1.id])).rows[0];
await como(bia, () => q(`select public.excluir_minha_conta()`));
const depois = (await q(`select comentarios, apoios from public.problemas where id=$1`, [p1.id])).rows[0];
passou('apaga comentários e apoios e corrige contagens', depois.comentarios === antes.comentarios - 1 && depois.apoios === antes.apoios - 1, JSON.stringify([antes, depois]));
passou('apaga o perfil', (await q(`select count(*)::int n from public.perfis where id=$1`, [bia])).rows[0].n === 0);

console.log(`\n${ok} passaram, ${falhas} falharam`);
process.exit(falhas ? 1 : 0);
