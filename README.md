# Lokaro Landing Page

Estrutura organizada para projeto estatico profissional.

## Estrutura

- `index.html` redireciona para a pagina principal
- `html/index.html` pagina principal
- `css/style.css` estilos
- `js/main.js` scripts
- `assets/images/logo.svg` logo do projeto

## Desenvolvimento local

1. Abra `index.html` na raiz do projeto.
2. Ou abra diretamente `html/index.html`.

## Deploy estatico

Voce pode publicar em:

- GitHub Pages
- Netlify
- Vercel (static)
- Cloudflare Pages

Use a raiz do projeto como pasta de publicacao. O arquivo `index.html` ja redireciona para `html/index.html`.

## Webhook Kiwify -> Supabase (desbloqueio de plano)

Este projeto agora possui endpoint de webhook em `api/kiwify-webhook.js` para atualizar o plano do cliente no Supabase quando uma compra for confirmada.

### 1) Criar tabela no Supabase

Execute o SQL de `supabase/billing_access.sql` no SQL Editor do Supabase.

Para o formulario de suporte da pagina em portugues, execute tambem:

- `supabase/support_requests.sql`

### 2) Configurar variaveis de ambiente no deploy (Vercel)

- `SUPABASE_URL` = URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` = chave service role do Supabase
- `KIWIFY_WEBHOOK_SECRET` = segredo usado para validar webhook (opcional, mas recomendado)
- `SUPPORT_ADMIN_KEY` = chave para abrir/listar o painel admin de suporte

### 3) Configurar webhook na Kiwify

- URL do webhook: `https://SEU_DOMINIO/api/kiwify-webhook`
- Header recomendado: `x-webhook-secret: <mesmo valor de KIWIFY_WEBHOOK_SECRET>`

### 4) Regra de desbloqueio implementada

- Compra de `49,00` ou produto com nome contendo `starter` -> plano `starter`
- Compra de `99,00` ou produto com nome contendo `pro` -> plano `pro`

As features liberadas sao gravadas no campo `unlocked_features` da tabela `billing_access`.

## Exemplo no app web (bloquear/desbloquear menu)

Arquivo pronto de exemplo: `supabase/plan-gating-example.js`

### Como usar

1) Instale o client Supabase no app web:

`npm i @supabase/supabase-js`

2) Configure no frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3) No bootstrap do app:

```js
import {
	createSupabaseClient,
	fetchMyBillingAccess,
	applyPlanGate
} from './supabase/plan-gating-example';

const supabase = createSupabaseClient();
const access = await fetchMyBillingAccess(supabase);
applyPlanGate(access);
```

4) Marque elementos com atributos:

- `data-min-plan="starter"` para exigir plano minimo
- `data-feature="advanced_reports"` para exigir feature especifica

Exemplo:

```html
<button data-min-plan="starter">Painel Financeiro</button>
<a data-feature="advanced_reports" href="/relatorios">Relatorios avancados</a>
```

Quando bloqueado, o elemento recebe classe `is-locked` e `disabled`.

## Integracao direta em pagina web (sem build)

Se seu app web roda sem bundler, use `js/plan-gating-runtime.js`.

1) Carregue o script na pagina:

```html
<script src="js/plan-gating-runtime.js"></script>
```

2) Defina configuracao global antes do script:

```html
<script>
	window.__LOKARO_SUPABASE__ = {
		url: 'https://SEU-PROJETO.supabase.co',
		anonKey: 'SUA_ANON_KEY',
		userEmail: 'email-do-cliente@dominio.com',
		// opcional quando houver sessao jwt no app
		accessToken: ''
	};
</script>
```

3) Marque itens da UI para bloqueio:

```html
<button data-min-plan="starter">Financeiro</button>
<a data-feature="advanced_reports">Relatorios avancados</a>
```

O script aplica bloqueio automaticamente com base no plano salvo em `billing_access`.

## Checklist rapido (antes da primeira assinatura real)

### 1) Banco no Supabase

1. Execute `supabase/billing_access.sql` no SQL Editor.
2. Confirme se a tabela existe: `billing_access`.

### 2) Variaveis no deploy (Vercel)

Configure no projeto:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KIWIFY_WEBHOOK_SECRET`

Depois, redeploy.

### 3) Webhook na Kiwify

1. URL: `https://SEU_DOMINIO/api/kiwify-webhook`
2. Header: `x-webhook-secret` com o mesmo valor de `KIWIFY_WEBHOOK_SECRET`.
3. Eventos: pagamento aprovado/compra concluida.

### 4) Teste de ponta a ponta (3 minutos)

1. Faça uma compra teste do plano `R$ 49,00` com email seu.
2. No Supabase, rode:

```sql
select email, plan, status, unlocked_features, updated_at
from public.billing_access
order by updated_at desc
limit 10;
```

3. Resultado esperado para `R$ 49,00`:

- `plan = starter`
- `status = active`
- `unlocked_features` contendo recursos do Starter

4. Repita com `R$ 99,00` e confirme `plan = pro`.

### 5) Se nao liberar automatico

Verifique nesta ordem:

1. URL de webhook correta
2. segredo do header igual ao ambiente
3. status do evento enviado pela Kiwify (paid/approved/completed)
4. env vars no deploy correto
5. app lendo `billing_access` pelo email do usuario autenticado

## Suporte por email (pagina BR)

`br.html` agora usa um formulario de suporte com:

- email obrigatorio
- mensagem obrigatoria (maximo 500 caracteres)
- aviso explicito de que as respostas sao enviadas somente por email

API usada pelo formulario/painel admin:

- `POST /api/support-requests` cria pergunta de suporte
- `GET /api/support-requests` lista perguntas (exige header `x-admin-key`)
- `PATCH /api/support-requests` marca pergunta como respondida (exige header `x-admin-key`)

No painel admin oculto da propria pagina, a equipe consegue:

- listar perguntas enviadas
- visualizar email do cliente no painel e marcar como respondido
- marcar ticket como `answered`
