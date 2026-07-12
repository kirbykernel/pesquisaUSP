# Arquitetura do Sistema - Aplicativo de Pesquisa

## Visão Geral

Sistema completo para pesquisa com residentes de medicina, dividido em dois grupos (intervenção e controle), com coleta de dados offline/online e painel administrativo.

## Componentes Principais

### 1. Aplicativo PWA (Participantes)
- **Tecnologia**: React + Vite + PWA
- **Funcionalidades**:
  - Login por número de identificação
  - Vídeo de boas-vindas (comum a ambos grupos)
  - Interface diferenciada por grupo
  - Funcionamento offline com IndexedDB
  - Sincronização automática quando online

### 2. Painel Administrativo
- **Tecnologia**: React + Vite
- **Funcionalidades**:
  - Cadastro de participantes
  - Randomização automática (intervenção/controle)
  - Upload de vídeo de boas-vindas
  - Upload de 4 áudios (grupo intervenção)
  - Upload de informações (grupo controle)
  - Visualização de dados coletados
  - Exportação para planilha Excel/CSV
  - Relatórios de uso e progresso

### 3. Backend API
- **Tecnologia**: Node.js + Express + PostgreSQL
- **Funcionalidades**:
  - Autenticação de participantes
  - Gerenciamento de conteúdo
  - Armazenamento de dados coletados
  - Sincronização de dados offline
  - Geração de relatórios
  - Upload e armazenamento de mídia

### 4. Banco de Dados
- **Tecnologia**: PostgreSQL
- **Estrutura**:
  - Tabela de participantes
  - Tabela de conteúdo (vídeos, áudios, informações)
  - Tabela de respostas diárias
  - Tabela de progresso de áudios
  - Tabela de atividades registradas

## Estrutura de Dados

### Participantes
```
- id (número único)
- grupo (intervenção/controle)
- data_cadastro
- data_randomizacao
- ativo
```

### Respostas Diárias
```
- id
- participante_id
- data
- bem_estar (1-5)
- atividade_atual (texto)
- timestamp
- sincronizado
```

### Progresso de Áudios (Grupo Intervenção)
```
- id
- participante_id
- audio_numero (1-4)
- dia (1-28)
- percentual_escutado
- completado
- data_acesso
- timestamp
```

### Conteúdo
```
- id
- tipo (video_boas_vindas/audio_intervencao/info_controle)
- arquivo_url
- numero_audio (1-4, se aplicável)
- ativo
```

## Fluxo de Dados

### Cadastro e Randomização
1. Admin cadastra participantes no painel
2. Sistema gera número único de identificação
3. Sistema randomiza automaticamente em grupo (intervenção/controle)
4. Participante recebe número para login

### Uso Diário - Grupo Intervenção
1. Participante faz login com número
2. Sistema verifica horário (10h-18h)
3. Exibe vídeo de boas-vindas (primeira vez)
4. Exibe áudio do dia (1-28 dias, 4 áudios repetidos)
5. Player bloqueia aceleração e pulo
6. Sistema registra percentual escutado
7. Após áudio, exibe pergunta de bem-estar (1-5)
8. Exibe campo para registrar atividade atual
9. Dados salvos localmente (offline) ou enviados (online)

### Uso Diário - Grupo Controle
1. Participante faz login com número
2. Sistema verifica horário (10h-18h)
3. Exibe vídeo de boas-vindas (primeira vez)
4. Exibe informações do dia
5. Exibe pergunta de bem-estar (1-5)
6. Exibe campo para registrar atividade atual
7. Dados salvos localmente (offline) ou enviados (online)

### Sincronização Offline
1. Dados salvos no IndexedDB quando offline
2. Service Worker detecta conexão online
3. Dados sincronizados automaticamente com servidor
4. Marcação de dados como sincronizados

### Exportação de Dados
1. Admin acessa painel de relatórios
2. Filtra por período, grupo, participante
3. Sistema gera planilha Excel/CSV com:
   - Número do participante
   - Grupo (codificado)
   - Data de cada acesso
   - Bem-estar diário
   - Atividade registrada
   - Percentual de áudios escutados (intervenção)
   - Áudios completados (intervenção)

## Requisitos Técnicos

### PWA (Progressive Web App)
- Manifest.json configurado
- Service Worker para cache e offline
- IndexedDB para armazenamento local
- Instalável na tela inicial do celular
- Funciona sem conexão

### Controles de Áudio
- Bloqueio de controles de velocidade
- Bloqueio de barra de progresso (não pode pular)
- Tracking preciso de posição atual
- Registro de percentual escutado
- Detecção de conclusão (100%)

### Restrições de Horário
- Verificação de horário local do dispositivo
- Bloqueio de acesso fora de 10h-18h
- Mensagem informativa quando fora do horário

### Segurança
- Autenticação por número único
- Dados anonimizados (apenas números)
- HTTPS obrigatório
- Backup automático de dados

## Tecnologias Utilizadas

### Frontend
- React 18
- Vite
- PWA Plugin
- IndexedDB (Dexie.js)
- React Router
- Axios
- Chart.js (relatórios)
- XLSX (exportação)

### Backend
- Node.js 22
- Express
- PostgreSQL
- Multer (upload de arquivos)
- JWT (autenticação admin)
- CORS

### Infraestrutura
- Servidor Linux
- Nginx (proxy reverso)
- PM2 (gerenciamento de processos)
- PostgreSQL Database
- Storage para mídia (vídeos/áudios)

## Próximos Passos

1. Inicializar projeto com estrutura de pastas
2. Configurar banco de dados PostgreSQL
3. Desenvolver API backend
4. Desenvolver painel administrativo
5. Desenvolver aplicativo PWA
6. Implementar funcionalidades offline
7. Implementar controles de áudio
8. Testar em diferentes dispositivos
9. Preparar documentação
10. Deploy e configuração
