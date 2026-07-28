# Tailândia em grupo

App do grupo para organizar roteiro, hospedagem, passeios e orçamento da viagem. Next.js (App Router) + Tailwind, com estado compartilhado persistido no Firebase Realtime Database (plano gratuito, sem cartão de crédito).

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

### 3. Criar o banco no Firebase (obrigatório para os dados serem compartilhados entre o grupo — gratuito, sem cartão)

Sem isso, cada visita usa um armazenamento temporário isolado e ninguém vê os dados de ninguém.

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um projeto novo (plano Spark/gratuito — não pede cartão).
2. No menu lateral, vá em **Build → Realtime Database → Create Database**. Escolha a região e inicie em **modo de teste** (ou modo bloqueado, ajustando as regras no passo seguinte).
3. Na aba **Rules**, defina:
   ```json
   {
     "rules": {
       "state": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```
   Publique as regras. Isso libera leitura/escrita apenas dentro do caminho `state` — a URL do banco não fica exposta ao público porque só o servidor (rodando na Vercel) a conhece.
4. Copie a **Database URL**, exibida no topo da página do Realtime Database (algo como `https://<project-id>-default-rtdb.firebaseio.com`).
5. No projeto na Vercel, vá em **Settings → Environment Variables** e adicione:
   - `FIREBASE_DB_URL` = a URL copiada (sem barra `/` no final)
6. Redeploy o projeto (Deployments → ⋯ → Redeploy) para que a nova env var seja aplicada.

### 4. Pronto

Cada pessoa do grupo acessa a URL do Vercel, digita o nome e o app já sincroniza roteiro, hospedagens, passeios e gastos entre todo mundo.

## Ícone do grupo

A imagem original está em `public/group-icon.png` (1024×1024, já em formato quadrado) — pode ser usada como foto do grupo no WhatsApp ou similar. O favicon do app (`app/icon.png`, 512×512) é aplicado automaticamente pelo Next.js.
