# PAUSA — Aplicativo de Pesquisa

Aplicativo web do **Ensaio Clínico Randomizado PAUSA**, conduzido com residentes de medicina (Grupo MEV HC-FMUSP). Os participantes são randomizados em dois grupos — **intervenção** (prática diária guiada por áudio) e **controle** (leitura de informações + timer) — e registram respostas diárias de bem-estar ao longo de um ciclo de 28 dias.

## Stack

- **Frontend**: React 19 + Vite 7, Tailwind CSS 4, shadcn/ui (Radix), wouter
- **API**: tRPC 11 sobre Express 4
- **Banco de dados**: MySQL, via Drizzle ORM (migrations em `drizzle/`)
- **Runtime**: Node.js, gerenciador de pacotes pnpm (via corepack)
- **Hospedagem**: plataforma Manus

## Estrutura

```
client/          # SPA React (páginas em src/pages/admin e src/pages/participant)
server/          # API tRPC + Express (routers.ts é o arquivo central)
server/_core/    # Scaffolding da plataforma Manus (OAuth, contexto, vite)
shared/          # Tipos e constantes compartilhados entre client e server
drizzle/         # Schema do banco e migrations SQL
patches/         # Patches de dependências aplicados pelo pnpm
```

## Desenvolvimento

Requer Node.js 20+ com corepack habilitado.

```bash
corepack pnpm install     # instalar dependências
corepack pnpm dev         # servidor de desenvolvimento
corepack pnpm check       # verificação de tipos (tsc --noEmit)
corepack pnpm build       # build de produção (client + server em dist/)
corepack pnpm start       # rodar o build de produção
corepack pnpm db:push     # gerar e aplicar migrations do Drizzle
corepack pnpm format      # formatar com prettier
```

## Variáveis de ambiente

Criar um arquivo `.env` na raiz (não versionado):

| Variável       | Descrição                                    |
| -------------- | -------------------------------------------- |
| `DATABASE_URL` | String de conexão MySQL                      |
| `JWT_SECRET`   | Segredo para assinatura dos cookies de sessão |

Na plataforma Manus, essas variáveis (e as `VITE_*` usadas no `index.html`) são injetadas automaticamente pelo ambiente de deploy.

## Autenticação

- **Administradores**: OAuth da plataforma Manus, com sessão em cookie JWT. Novos admins entram por convite (tabela `adminInvites`).
- **Participantes**: login apenas com o número de identificação (formato `P` + 9 dígitos), sem senha — decisão de desenho do estudo para simplificar o acesso dos residentes.

## Regras de negócio principais

- O progresso do participante segue um **modelo de fases**: o dia só avança quando a prática do dia é completada. O dia atual é calculado e validado **no servidor** (respostas registradas + 1).
- Máximo de **1 resposta por dia de calendário**, no fuso `America/Sao_Paulo`.
- O ciclo do participante encerra no **dia 28**.
- O aplicativo funciona **apenas online** (sem modo offline).

## Deploy

O deploy é feito pela plataforma Manus, que faz o pull deste repositório, executa o build e publica. Mudanças locais só chegam à produção após esse processo.
