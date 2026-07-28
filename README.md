# Tailândia em grupo

App do grupo para organizar roteiro, hospedagem, passeios e orçamento da viagem. Next.js (App Router) + Tailwind, com estado compartilhado persistido em Redis (Upstash, via Vercel Storage).

## Rodando localmente

```bash
npm install
npm run dev
```

Sem variáveis de ambiente configuradas, o app usa um armazenamento em memória (só para dev — os dados somem quando o servidor reinicia).

## Deploy no Vercel

### 1. Subir o código pro GitHub (recomendado, permite redeploy automático a cada push)

```bash
git init
git add .
git commit -m "Primeira versão do app da Tailândia"
```

Depois crie um repositório no GitHub (pelo site ou `gh repo create`) e faça o push.

### 2. Importar no Vercel

No [vercel.com/new](https://vercel.com/new), importe o repositório. O Vercel detecta Next.js automaticamente — não precisa configurar build command nem output directory.

### 3. Adicionar o banco Redis (obrigatório para os dados serem compartilhados entre o grupo)

Sem isso, cada visita usa um armazenamento temporário isolado e ninguém vê os dados de ninguém.

1. No projeto dentro do Vercel, vá em **Storage** → **Create Database** → escolha **Redis** (via Upstash, no Marketplace).
2. Conecte o banco ao projeto. O Vercel injeta automaticamente as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN`, que é exatamente o que o código em [`lib/store.js`](lib/store.js) espera.
3. Redeploy o projeto (Deployments → ⋯ → Redeploy) para que as novas env vars sejam aplicadas.

### 4. Pronto

Cada pessoa do grupo acessa a URL do Vercel, digita o nome e o app já sincroniza roteiro, hospedagens, passeios e gastos entre todo mundo.

## Ícone do grupo

A imagem original está em `public/group-icon.png` (1024×1024, já em formato quadrado) — pode ser usada como foto do grupo no WhatsApp ou similar. O favicon do app (`app/icon.png`, 512×512) é aplicado automaticamente pelo Next.js.
