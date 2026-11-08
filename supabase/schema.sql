-- Melhora Extremoz RN: banco, regras e permissões.
-- Rode uma vez no SQL Editor do Supabase. As regras valem no servidor, não só na tela.
-- Depois, para virar administrador (troque o e-mail):
--   insert into public.admins (user_id) select id from auth.users where email = 'r4sjunior@gmail.com';

-- ---------- tabelas ----------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default 'Morador(a)' check (char_length(nome) between 2 and 40 and nome !~ '[<>@]'),
  nome_escolhido boolean not null default false,
  criado_em timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.suspensoes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  em timestamptz not null default now()
);

create table public.regras (
  id int primary key default 1 check (id = 1),
  publicacoes_por_janela int not null default 2 check (publicacoes_por_janela between 1 and 50),
  janela_horas int not null default 1 check (janela_horas between 1 and 168),
  denuncias_ocultar int not null default 3 check (denuncias_ocultar between 1 and 50),
  idade_minima_denuncia_horas int not null default 24 check (idade_minima_denuncia_horas between 0 and 720),
  atualizado_em timestamptz not null default now()
);
insert into public.regras (id) values (1);

create table public.problemas (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.perfis (id) on delete cascade,
  categoria text not null check (categoria in ('buraco','iluminacao','lixo','agua','esgoto','alagamento','erosao','praia','lagoa','arvore','animal','sinalizacao','transporte','acessibilidade','espaco','inseguro','poluicao','outro')),
  titulo text not null,
  descricao text not null,
  via text not null check (char_length(via) between 2 and 120),
  numero text check (char_length(numero) <= 8),
  referencia text check (char_length(referencia) <= 80),
  localidade text not null check (char_length(localidade) between 2 and 60),
  zona text not null check (zona in ('sede','moinho','estivas','litoral','genipabu','interior')),
  lat double precision not null check (lat between -5.76 and -5.60),
  lon double precision not null check (lon between -35.37 and -35.17),
  fotos text[] not null default '{}' check (cardinality(fotos) <= 3),
  status text not null default 'aberto' check (status in ('aberto','andamento','resolvido','removido')),
  protocolo text check (char_length(protocolo) <= 40),
  apoios int not null default 1,
  comentarios int not null default 0,
  denuncias_pendentes int not null default 0,
  graves_pendentes int not null default 0,
  denuncias_total int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  removido_em timestamptz,
  check (status = 'removido' or char_length(titulo) between 4 and 40),
  check (status = 'removido' or char_length(descricao) between 15 and 1200)
);
create index problemas_status_idx on public.problemas (status);
create index problemas_autor_idx on public.problemas (autor_id, criado_em desc);

-- Registro de publicações: excluir um problema não devolve a cota da janela.
create table public.publicacoes_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  em timestamptz not null default now()
);
create index publicacoes_log_idx on public.publicacoes_log (user_id, em desc);

create table public.apoios (
  problema_id uuid not null references public.problemas (id) on delete cascade,
  user_id uuid not null references public.perfis (id) on delete cascade,
  em timestamptz not null default now(),
  primary key (problema_id, user_id)
);
create index apoios_user_idx on public.apoios (user_id);

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  problema_id uuid not null references public.problemas (id) on delete cascade,
  autor_id uuid not null references public.perfis (id) on delete cascade,
  texto text not null check (char_length(texto) between 3 and 600),
  em timestamptz not null default now()
);
create index comentarios_problema_idx on public.comentarios (problema_id, em);
create index comentarios_autor_idx on public.comentarios (autor_id, em desc);

create table public.denuncias (
  problema_id uuid not null references public.problemas (id) on delete cascade,
  user_id uuid not null references public.perfis (id) on delete cascade,
  motivo text not null check (motivo in ('Não é um problema urbano','Conteúdo ofensivo','Conteúdo sexual, violento ou ilegal','Informação falsa','Duplicado','Expõe dados pessoais')),
  grave boolean not null default false,
  revisada boolean not null default false,
  em timestamptz not null default now(),
  primary key (problema_id, user_id)
);
create index denuncias_user_idx on public.denuncias (user_id, em desc);

create table public.historico_status (
  id bigint generated always as identity primary key,
  problema_id uuid not null references public.problemas (id) on delete cascade,
  status text not null,
  protocolo text,
  nota text check (char_length(nota) <= 300),
  em timestamptz not null default now()
);
create index historico_problema_idx on public.historico_status (problema_id, em);

create table public.moderacao_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  problema_id uuid,
  acao text not null,
  em timestamptz not null default now()
);

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  email text not null check (char_length(email) between 5 and 200),
  assunto text not null check (char_length(assunto) between 3 and 100),
  texto text not null check (char_length(texto) between 10 and 2000),
  lida boolean not null default false,
  em timestamptz not null default now()
);
create index mensagens_email_idx on public.mensagens (email, em desc);

create table public.patrocinios (
  id uuid primary key default gen_random_uuid(),
  patrocinador text not null default '' check (char_length(patrocinador) <= 60),
  titulo text not null check (char_length(titulo) between 1 and 70),
  texto text not null default '' check (char_length(texto) <= 180),
  botao text not null default 'Saiba mais' check (char_length(botao) <= 24),
  url text check (url is null or url ~ '^https?://'),
  imagem text,
  ativo boolean not null default false,
  espacos text[] not null default '{}',
  segundos int not null default 10 check (segundos between 3 and 300),
  ordem int not null default 0
);

create table public.visitas (
  sessao text primary key check (char_length(sessao) <= 40),
  visitante text not null check (char_length(visitante) <= 40),
  dispositivo text not null check (dispositivo in ('celular','computador')),
  origem text not null check (char_length(origem) <= 40),
  paginas text[] not null default '{}',
  inicio timestamptz not null default now(),
  ultimo timestamptz not null default now()
);
create index visitas_inicio_idx on public.visitas (inicio);

-- ---------- funções de apoio ----------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
    and (
      coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
    );
$$;

create function public.esta_suspenso() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.suspensoes where user_id = auth.uid());
$$;

create function public.problema_publico(p public.problemas) returns boolean
language sql stable security definer set search_path = '' as $$
  select p.status <> 'removido' and p.graves_pendentes = 0
    and p.denuncias_pendentes < (select denuncias_ocultar from public.regras where id = 1);
$$;

create function public.problema_visivel(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.problemas p
    where p.id = pid and (public.problema_publico(p) or p.autor_id = auth.uid() or public.is_admin())
  );
$$;

-- ---------- gatilhos ----------
create function public.novo_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_perfil();

create function public.antes_de_publicar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.regras; n int; f text;
begin
  if public.esta_suspenso() then
    raise exception 'Sua conta está suspensa e não pode publicar.' using errcode = 'P0001';
  end if;
  select * into r from public.regras where id = 1;
  select count(*) into n from public.publicacoes_log
    where user_id = new.autor_id and em > now() - make_interval(hours => r.janela_horas);
  if n >= r.publicacoes_por_janela then
    raise exception 'Limite atingido: % publicação(ões) a cada % hora(s). Enquanto isso, apoie e comente.', r.publicacoes_por_janela, r.janela_horas using errcode = 'P0001';
  end if;
  foreach f in array new.fotos loop
    if f !~ ('^' || new.autor_id::text || '/[a-z0-9-]{6,60}\.(jpg|png|webp|gif)$') then
      raise exception 'Foto inválida.' using errcode = 'P0001';
    end if;
  end loop;
  -- Campos que só o servidor define
  new.titulo := btrim(new.titulo);
  new.descricao := btrim(new.descricao);
  new.status := 'aberto';
  new.protocolo := null;
  new.apoios := 1;
  new.comentarios := 0;
  new.denuncias_pendentes := 0;
  new.graves_pendentes := 0;
  new.denuncias_total := 0;
  new.criado_em := now();
  new.atualizado_em := now();
  new.removido_em := null;
  insert into public.publicacoes_log (user_id) values (new.autor_id);
  return new;
end $$;
create trigger publicar before insert on public.problemas
  for each row execute function public.antes_de_publicar();

create function public.apos_publicar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.historico_status (problema_id, status) values (new.id, 'aberto');
  return null;
end $$;
create trigger publicado after insert on public.problemas
  for each row execute function public.apos_publicar();

create function public.antes_de_mudar_problema() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  if new.status = 'removido' and old.status <> 'removido' then
    -- Remoção pela moderação apaga texto e fotos de verdade; fica só o registro de que existiu.
    new.titulo := ''; new.descricao := ''; new.fotos := '{}'; new.numero := null; new.referencia := null;
    new.removido_em := now();
  end if;
  return new;
end $$;
create trigger mudar_problema before update on public.problemas
  for each row execute function public.antes_de_mudar_problema();

create function public.apos_mudar_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status or new.protocolo is distinct from old.protocolo then
    insert into public.historico_status (problema_id, status, protocolo) values (new.id, new.status, new.protocolo);
  end if;
  return null;
end $$;
create trigger status_mudou after update on public.problemas
  for each row execute function public.apos_mudar_status();

create function public.antes_de_apoiar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.esta_suspenso() then
    raise exception 'Sua conta está suspensa e não pode apoiar.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.problemas where id = new.problema_id and autor_id = new.user_id) then
    raise exception 'Quem publica já conta como o primeiro apoio.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger apoiar before insert on public.apoios
  for each row execute function public.antes_de_apoiar();

create function public.contar_apoios() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.problemas set apoios = apoios + (case tg_op when 'INSERT' then 1 else -1 end)
    where id = coalesce(new.problema_id, old.problema_id);
  return null;
end $$;
create trigger apoio_contado after insert or delete on public.apoios
  for each row execute function public.contar_apoios();

create function public.antes_de_comentar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.esta_suspenso() then
    raise exception 'Sua conta está suspensa e não pode comentar.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.comentarios where autor_id = new.autor_id and em > now() - interval '10 minutes') >= 10 then
    raise exception 'Muitos comentários em pouco tempo. Aguarde alguns minutos.' using errcode = 'P0001';
  end if;
  new.texto := btrim(new.texto);
  new.em := now();
  return new;
end $$;
create trigger comentar before insert on public.comentarios
  for each row execute function public.antes_de_comentar();

create function public.contar_comentarios() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.problemas set comentarios = comentarios + (case tg_op when 'INSERT' then 1 else -1 end)
    where id = coalesce(new.problema_id, old.problema_id);
  return null;
end $$;
create trigger comentario_contado after insert or delete on public.comentarios
  for each row execute function public.contar_comentarios();

create function public.antes_de_denunciar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare idade int;
begin
  if public.esta_suspenso() then
    raise exception 'Sua conta está suspensa e não pode denunciar.' using errcode = 'P0001';
  end if;
  select idade_minima_denuncia_horas into idade from public.regras where id = 1;
  if (select criado_em from public.perfis where id = new.user_id) > now() - make_interval(hours => idade) then
    raise exception 'Contas novas só podem denunciar depois de % horas.', idade using errcode = 'P0001';
  end if;
  if exists (select 1 from public.problemas where id = new.problema_id and autor_id = new.user_id) then
    raise exception 'Você não pode denunciar a própria publicação.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.denuncias where user_id = new.user_id and em > now() - interval '1 day') >= 10 then
    raise exception 'Limite de denúncias do dia atingido. Fale com a moderação se precisar de mais.' using errcode = 'P0001';
  end if;
  new.grave := new.motivo = 'Conteúdo sexual, violento ou ilegal';
  new.revisada := false;
  new.em := now();
  return new;
end $$;
create trigger denunciar before insert on public.denuncias
  for each row execute function public.antes_de_denunciar();

create function public.contar_denuncias() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.problemas set
      denuncias_pendentes = denuncias_pendentes + 1,
      graves_pendentes = graves_pendentes + (case when new.grave then 1 else 0 end),
      denuncias_total = denuncias_total + 1
    where id = new.problema_id;
  elsif not old.revisada then
    update public.problemas set
      denuncias_pendentes = greatest(0, denuncias_pendentes - 1),
      graves_pendentes = greatest(0, graves_pendentes - (case when old.grave then 1 else 0 end))
    where id = old.problema_id;
  end if;
  return null;
end $$;
create trigger denuncia_contada after insert or delete on public.denuncias
  for each row execute function public.contar_denuncias();

-- ---------- funções chamadas pelo site ----------
create function public.definir_protocolo(p_id uuid, p_protocolo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.problemas where id = p_id and status <> 'removido' and (autor_id = auth.uid() or public.is_admin())) then
    raise exception 'Só quem publicou pode informar o protocolo.' using errcode = 'P0001';
  end if;
  update public.problemas set protocolo = nullif(left(btrim(p_protocolo), 40), '') where id = p_id;
end $$;

create function public.moderar_problema(p_id uuid, p_acao text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Área restrita à administração.' using errcode = 'P0001';
  end if;
  if p_acao = 'manter' then
    update public.denuncias set revisada = true where problema_id = p_id;
    update public.problemas set denuncias_pendentes = 0, graves_pendentes = 0 where id = p_id;
  elsif p_acao = 'remover' then
    update public.denuncias set revisada = true where problema_id = p_id;
    update public.problemas set status = 'removido', denuncias_pendentes = 0, graves_pendentes = 0 where id = p_id;
  else
    raise exception 'Ação inválida.' using errcode = 'P0001';
  end if;
  insert into public.moderacao_log (admin_id, problema_id, acao) values (auth.uid(), p_id, p_acao);
end $$;

create function public.mudar_status(p_id uuid, p_status text, p_nota text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Área restrita à administração.' using errcode = 'P0001';
  end if;
  if p_status not in ('aberto','andamento','resolvido') then
    raise exception 'Status inválido.' using errcode = 'P0001';
  end if;
  update public.problemas set status = p_status where id = p_id and status <> 'removido';
  if p_nota is not null and btrim(p_nota) <> '' then
    update public.historico_status set nota = left(btrim(p_nota), 300)
      where id = (select max(id) from public.historico_status where problema_id = p_id);
  end if;
  insert into public.moderacao_log (admin_id, problema_id, acao) values (auth.uid(), p_id, 'status:' || p_status);
end $$;

create function public.enviar_mensagem(p_email text, p_assunto text, p_texto text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'E-mail inválido.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.mensagens where lower(email) = lower(p_email) and em > now() - interval '1 hour') >= 3
     or (select count(*) from public.mensagens where em > now() - interval '1 day') >= 200 then
    raise exception 'Muitas mensagens em pouco tempo. Tente de novo mais tarde.' using errcode = 'P0001';
  end if;
  insert into public.mensagens (user_id, email, assunto, texto) values (auth.uid(), btrim(p_email), btrim(p_assunto), btrim(p_texto));
end $$;

create function public.registrar_visita(p_sessao text, p_visitante text, p_pagina text, p_dispositivo text, p_origem text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_dispositivo not in ('celular','computador') or char_length(p_sessao) > 40 or char_length(p_visitante) > 40 or char_length(p_pagina) > 20 then
    return;
  end if;
  insert into public.visitas (sessao, visitante, dispositivo, origem, paginas)
    values (p_sessao, p_visitante, p_dispositivo, left(coalesce(nullif(p_origem, ''), 'Direto'), 40), array[p_pagina])
  on conflict (sessao) do update set
    ultimo = now(),
    paginas = case when p_pagina = any (public.visitas.paginas) or cardinality(public.visitas.paginas) >= 12 then public.visitas.paginas
                   else public.visitas.paginas || p_pagina end;
  -- Retenção: estatísticas somem depois de 400 dias.
  if random() < 0.01 then
    delete from public.visitas where inicio < now() - interval '400 days';
  end if;
end $$;

create function public.painel_acessos(p_dias int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare de timestamptz := now() - make_interval(days => greatest(1, least(p_dias, 400)));
begin
  if not public.is_admin() then
    raise exception 'Área restrita à administração.' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'visitas', (select count(*) from public.visitas where inicio >= de),
    'pessoas', (select count(distinct visitante) from public.visitas where inicio >= de),
    'por_dia', coalesce((select jsonb_agg(x order by x.dia) from (
       select to_char(inicio at time zone 'America/Fortaleza', 'YYYY-MM-DD') dia, count(*) visitas, count(distinct visitante) pessoas
       from public.visitas where inicio >= de group by 1) x), '[]'),
    'dispositivos', coalesce((select jsonb_object_agg(dispositivo, n) from (
       select dispositivo, count(*) n from public.visitas where inicio >= de group by 1) x), '{}'),
    'origens', coalesce((select jsonb_agg(x order by x.visitas desc) from (
       select origem, count(*) visitas from public.visitas where inicio >= de group by 1 order by 2 desc limit 12) x), '[]'),
    'paginas', coalesce((select jsonb_object_agg(pagina, n) from (
       select pagina, count(*) n from public.visitas, unnest(paginas) pagina where inicio >= de group by 1) x), '{}')
  );
end $$;

create function public.admin_usuarios() returns table (
  id uuid, nome text, criado_em timestamptz, problemas bigint, apoios bigint, comentarios bigint,
  denuncias_feitas bigint, denuncias_recebidas bigint, suspenso boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Área restrita à administração.' using errcode = 'P0001';
  end if;
  return query
    select p.id, p.nome, p.criado_em,
      (select count(*) from public.problemas x where x.autor_id = p.id),
      (select count(*) from public.apoios x where x.user_id = p.id),
      (select count(*) from public.comentarios x where x.autor_id = p.id),
      (select count(*) from public.denuncias x where x.user_id = p.id),
      (select coalesce(sum(x.denuncias_total), 0)::bigint from public.problemas x where x.autor_id = p.id),
      exists (select 1 from public.suspensoes s where s.user_id = p.id)
    from public.perfis p
    order by 8 desc, 4 desc, p.criado_em desc;
end $$;

create function public.definir_suspensao(p_user uuid, p_suspenso boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Área restrita à administração.' using errcode = 'P0001';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode suspender a própria conta.' using errcode = 'P0001';
  end if;
  if p_suspenso then
    insert into public.suspensoes (user_id) values (p_user) on conflict do nothing;
  else
    delete from public.suspensoes where user_id = p_user;
  end if;
  insert into public.moderacao_log (admin_id, acao) values (auth.uid(), case when p_suspenso then 'suspender' else 'reativar' end);
end $$;

-- As fotos saem do Storage pelo site antes desta chamada; aqui apaga conta, publicações e tudo o que depende dela.
create function public.excluir_minha_conta() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.' using errcode = 'P0001';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- permissões ----------
alter table public.perfis enable row level security;
alter table public.admins enable row level security;
alter table public.suspensoes enable row level security;
alter table public.regras enable row level security;
alter table public.problemas enable row level security;
alter table public.publicacoes_log enable row level security;
alter table public.apoios enable row level security;
alter table public.comentarios enable row level security;
alter table public.denuncias enable row level security;
alter table public.historico_status enable row level security;
alter table public.moderacao_log enable row level security;
alter table public.mensagens enable row level security;
alter table public.patrocinios enable row level security;
alter table public.visitas enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select on public.perfis, public.regras, public.problemas, public.comentarios, public.historico_status, public.patrocinios to anon, authenticated;
grant update (nome, nome_escolhido) on public.perfis to authenticated;
grant select on public.admins, public.suspensoes, public.apoios, public.denuncias, public.mensagens to authenticated;
grant insert, delete on public.apoios to authenticated;
grant insert, delete on public.comentarios to authenticated;
grant insert (id, autor_id, categoria, titulo, descricao, via, numero, referencia, localidade, zona, lat, lon, fotos) on public.problemas to authenticated;
grant delete on public.problemas to authenticated;
grant insert on public.denuncias to authenticated;
grant update (lida) on public.mensagens to authenticated;
grant delete on public.mensagens to authenticated;
grant update on public.regras to authenticated;
grant insert, update, delete on public.patrocinios to authenticated;
grant select on public.moderacao_log to authenticated;

grant execute on function public.is_admin(), public.esta_suspenso(), public.problema_publico(public.problemas), public.problema_visivel(uuid) to anon, authenticated;
grant execute on function public.enviar_mensagem(text, text, text), public.registrar_visita(text, text, text, text, text) to anon, authenticated;
grant execute on function public.definir_protocolo(uuid, text), public.moderar_problema(uuid, text), public.mudar_status(uuid, text, text),
  public.painel_acessos(int), public.admin_usuarios(), public.definir_suspensao(uuid, boolean), public.excluir_minha_conta() to authenticated;

create policy "nomes são públicos" on public.perfis for select using (true);
create policy "cada um muda o próprio nome" on public.perfis for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "ver o próprio cadastro de admin" on public.admins for select to authenticated using (user_id = auth.uid());
create policy "ver a própria suspensão" on public.suspensoes for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "regras são públicas" on public.regras for select using (true);
create policy "admin muda regras" on public.regras for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "problemas visíveis" on public.problemas for select
  using (public.problema_publico(problemas) or autor_id = auth.uid() or public.is_admin());
create policy "publicar como si mesmo" on public.problemas for insert to authenticated with check (autor_id = auth.uid());
create policy "excluir o próprio problema" on public.problemas for delete to authenticated using (autor_id = auth.uid());

create policy "ver os próprios apoios" on public.apoios for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "apoiar como si mesmo" on public.apoios for insert to authenticated
  with check (user_id = auth.uid() and public.problema_visivel(problema_id));
create policy "retirar o próprio apoio" on public.apoios for delete to authenticated using (user_id = auth.uid());

create policy "comentários de problemas visíveis" on public.comentarios for select using (public.problema_visivel(problema_id));
create policy "comentar como si mesmo" on public.comentarios for insert to authenticated
  with check (autor_id = auth.uid() and public.problema_visivel(problema_id));
create policy "excluir comentário" on public.comentarios for delete to authenticated using (autor_id = auth.uid() or public.is_admin());

create policy "ver as próprias denúncias" on public.denuncias for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "denunciar como si mesmo" on public.denuncias for insert to authenticated
  with check (user_id = auth.uid() and public.problema_visivel(problema_id));

create policy "histórico de problemas visíveis" on public.historico_status for select using (public.problema_visivel(problema_id));
create policy "admin vê o registro de moderação" on public.moderacao_log for select to authenticated using (public.is_admin());

create policy "admin lê mensagens" on public.mensagens for select to authenticated using (public.is_admin());
create policy "admin marca mensagens" on public.mensagens for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin apaga mensagens" on public.mensagens for delete to authenticated using (public.is_admin());

create policy "patrocínios ativos são públicos" on public.patrocinios for select using (ativo or public.is_admin());
create policy "admin cria patrocínio" on public.patrocinios for insert to authenticated with check (public.is_admin());
create policy "admin muda patrocínio" on public.patrocinios for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin apaga patrocínio" on public.patrocinios for delete to authenticated using (public.is_admin());

-- ---------- fotos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "enviar fotos na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text and not public.esta_suspenso());
create policy "apagar as próprias fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "listar a própria pasta" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------- tempo real ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.problemas;
  end if;
end $$;
