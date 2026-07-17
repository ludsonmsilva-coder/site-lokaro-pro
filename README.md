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

### 2) Configurar variaveis de ambiente no deploy (Vercel)

- `SUPABASE_URL` = URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` = chave service role do Supabase
- `KIWIFY_WEBHOOK_SECRET` = segredo usado para validar webhook (opcional, mas recomendado)

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
