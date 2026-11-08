# Melhora Extremoz RN

Mapa colaborativo dos problemas urbanos de Extremoz/RN: marque no mapa, junte a vizinhança, cobre a solução.

Projeto independente, escrito do zero. A ideia foi inspirada no MelhoraBH; nenhum código, texto ou marca foi copiado.

## Testar agora (sem conta nenhuma)

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Sem chaves do Supabase, o app roda em **modo de teste**: os dados são fictícios e ficam só no seu navegador. O botão "Restaurar exemplos", no topo, volta tudo ao início. Para testar o painel, entre marcando "Entrar como administrador".

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local |
| `npm run build` | Confere os tipos e gera `dist/` |
| `npm test` | Testes da busca, endereços e planilha |
| `npm run test:sql` | Testa as regras do banco num Postgres em memória |
| `npm run geodata` | Refaz os dados do mapa (baixa do IBGE e do OpenStreetMap) |
| `npm run icons` | Refaz ícones e imagem de compartilhamento |

## Ligar o backend real

1. Crie um projeto no [Supabase](https://supabase.com), de preferência na região de São Paulo.
2. No **SQL Editor**, rode todo o arquivo `supabase/schema.sql`.
3. Em **Authentication > URL Configuration**, defina a Site URL e inclua os endereços do site (e `http://localhost:5173` para testes) nas Redirect URLs.
4. Em **Authentication > Providers**, ative Google (precisa de credenciais OAuth do Google Cloud) e mantenha E-mail ligado. Para volume real de e-mails, configure um SMTP próprio: o padrão do Supabase tem limite baixo.
5. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (a chave pública, nunca a `service_role`).
6. Entre no site uma vez e depois, no SQL Editor, torne sua conta administradora:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'r4sjunior@gmail.com';
   ```
7. Abra `/painel` e ative a verificação em duas etapas. Ative antes o TOTP em **Authentication > Multi-Factor**, se estiver desligado.

Opcional: crie um site no Cloudflare Turnstile, coloque a chave secreta em **Authentication > Attack Protection** no Supabase e a pública em `VITE_TURNSTILE_SITE_KEY`.

## Publicar na Vercel

Importe o repositório: o `vercel.json` já traz framework, rotas e cabeçalhos de segurança. Em **Settings > Environment Variables**, cadastre as mesmas `VITE_*` do `.env.local` e faça um novo deploy.

**Atenção:** sem essas variáveis, o site publicado abre em modo de teste, com dados fictícios.

## Antes de divulgar

- Revisão jurídica de `/termos` e `/privacidade`.
- Conferir contatos em `src/dados/contatos.ts`. O telefone da Câmara vem de um edital de 2017.
- Conferir a divisão de zonas e os nomes em `scripts/localidades.mjs` (depois rode `npm run geodata`).
- Trocar `public/compartilhar.png` se quiser outra imagem nas redes.

## Onde mexer

| Assunto | Arquivo |
|---|---|
| Categorias, cores, limites | `src/dados/constantes.ts` |
| Prefeitura, Câmara, vereadores | `src/dados/contatos.ts` |
| Zonas e nomes de bairro | `scripts/localidades.mjs` |
| Regras e permissões do servidor | `supabase/schema.sql` |
| Visual | `src/styles.css` |

## Fontes dos dados

- Endereços: CNEFE, IBGE, Censo 2022. Só via, número, localidade e coordenada.
- Zonas e contorno: malha de setores censitários, IBGE, Censo 2022. As zonas foram propostas pelo projeto e não são divisão oficial.
- `public/data/referencias.json`: nomes de bairro do OpenStreetMap, © colaboradores do OpenStreetMap, licença [ODbL](https://opendatacommons.org/licenses/odbl/).
- Mapa-base: OpenFreeMap, OpenMapTiles e OpenStreetMap.
- Eleitos em 2024: dados abertos do TSE.
