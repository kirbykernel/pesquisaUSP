# Guia do Usuário - Aplicativo de Pesquisa com Residentes de Medicina

## Visão Geral

Este é um sistema completo para coleta de dados de pesquisa científica com residentes de medicina. O aplicativo funciona como PWA (Progressive Web App), permitindo instalação em smartphones e funcionamento offline.

## Links do Aplicativo

### Ambiente de Desenvolvimento (Para Testes)

**IMPORTANTE:** Estes links são temporários e devem ser usados apenas para testes. Após publicar o aplicativo, você receberá links permanentes.

- **Página Inicial**: https://3000-ijj5wne4oyffd5f0t9mxw-58e807d3.manusvm.computer/
- **Login Participantes**: https://3000-ijj5wne4oyffd5f0t9mxw-58e807d3.manusvm.computer/participant/login
- **Painel Admin**: https://3000-ijj5wne4oyffd5f0t9mxw-58e807d3.manusvm.computer/admin

### Após Publicação

Quando você publicar o aplicativo (clicando no botão "Publish" na interface de gerenciamento), você receberá um link permanente no formato:
- `https://seu-projeto.manus.space`

Esse link permanente deve ser usado para a pesquisa oficial e distribuído aos participantes.

## Para Administradores

### Acesso ao Painel Administrativo

1. Acesse o painel admin:
   - **Desenvolvimento**: https://3000-ijj5wne4oyffd5f0t9mxw-58e807d3.manusvm.computer/admin
   - **Após publicação**: https://seu-projeto.manus.space/admin
2. Faça login com sua conta Manus

### Cadastro de Participantes

1. No menu lateral, clique em "Participantes"
2. Digite a quantidade de participantes desejada (1-100)
3. Clique em "Criar Participantes"
4. O sistema irá:
   - Gerar números únicos de identificação (formato: P123456789)
   - Randomizar automaticamente em grupos (intervenção ou controle)
   - Salvar no banco de dados

5. Exporte a lista de participantes clicando em "Exportar"
6. Distribua os números de identificação aos participantes (mantenha sigilo sobre os grupos)

### Upload de Conteúdo

#### Vídeo de Boas-Vindas
1. Acesse "Conteúdo" no menu
2. Na seção "Vídeo de Boas-Vindas", clique em "Selecione o vídeo"
3. Escolha o arquivo de vídeo
4. Clique em "Enviar Vídeo"
5. Este vídeo será exibido para TODOS os participantes (intervenção e controle)

#### Áudios de Intervenção
1. Na seção "Áudios de Intervenção", faça upload dos 4 áudios
2. Cada áudio será repetido por 7 dias:
   - Áudio 1: Dias 1-7
   - Áudio 2: Dias 8-14
   - Áudio 3: Dias 15-21
   - Áudio 4: Dias 22-28

3. Selecione cada arquivo e clique em "Enviar"
4. Estes áudios são APENAS para o grupo intervenção

#### Informações do Grupo Controle
1. Na seção "Informações do Grupo Controle", digite o texto
2. Este texto será exibido diariamente para o grupo controle
3. Clique em "Salvar Informações"

### Exportação de Dados

1. Acesse "Relatórios" no menu
2. Escolha o tipo de exportação:
   - **Respostas Diárias**: Bem-estar e atividades
   - **Progresso de Áudios**: Percentual escutado (apenas intervenção)
   - **Relatório Completo**: Todos os dados em um arquivo

3. Clique em "Exportar" para baixar o arquivo CSV
4. Abra no Excel, Google Sheets, SPSS, R ou Python para análise

### Visualização de Dados

1. Acesse "Dashboard" para estatísticas gerais
2. Acesse "Dados Coletados" para visualizar respostas individuais
3. Use "Participantes" para ver a lista completa com grupos

### Como Apagar Dados de Teste

**IMPORTANTE:** Use esta função apenas durante o período de testes, ANTES de iniciar a pesquisa oficial.

#### Método 1: Via Interface de Gerenciamento (Recomendado)

1. Clique no botão de gerenciamento no canto superior direito da tela de chat
2. Acesse a aba **"Database"**
3. Você verá todas as tabelas do banco de dados:
   - `participants` - Participantes cadastrados
   - `dailyResponses` - Respostas diárias
   - `audioProgress` - Progresso de áudios
   - `content` - Conteúdo (vídeos, áudios, informações)

4. Para apagar dados de teste:
   - **Apagar respostas de teste**: Selecione registros na tabela `dailyResponses` e delete
   - **Apagar progresso de áudios de teste**: Selecione registros na tabela `audioProgress` e delete
   - **Apagar participantes de teste**: Selecione registros na tabela `participants` e delete
   - **Apagar conteúdo de teste**: Selecione registros na tabela `content` e delete

5. Após apagar os dados de teste, cadastre novos participantes para a pesquisa oficial

#### Método 2: Apagar Tudo e Recomeçar

Se preferir começar do zero:

1. Acesse a aba **"Database"** na interface de gerenciamento
2. Execute os seguintes comandos SQL (um de cada vez):

```sql
DELETE FROM audioProgress;
```

```sql
DELETE FROM dailyResponses;
```

```sql
DELETE FROM participants;
```

```sql
DELETE FROM content;
```

3. Isso apagará TODOS os dados, permitindo que você recomece do zero
4. Faça novo upload de vídeos, áudios e informações
5. Cadastre novos participantes

#### Checklist Antes de Iniciar a Pesquisa Oficial

- [ ] Testou o aplicativo com participantes fictícios
- [ ] Verificou que vídeo, áudios e informações estão corretos
- [ ] Testou funcionamento offline
- [ ] Testou exportação de dados
- [ ] Apagou TODOS os dados de teste
- [ ] Fez upload do conteúdo definitivo da pesquisa
- [ ] Cadastrou os participantes oficiais
- [ ] Distribuiu os números de identificação
- [ ] Orientou os participantes sobre como instalar e usar o app

## Para Participantes

### Instalação do Aplicativo no Celular

#### Android (Chrome)
1. Abra o link do aplicativo no Chrome
2. Toque no menu (⋮) no canto superior direito
3. Selecione "Adicionar à tela inicial" ou "Instalar app"
4. Confirme a instalação
5. O ícone aparecerá na tela inicial do seu celular

#### iOS (Safari)
1. Abra o link do aplicativo no Safari
2. Toque no ícone de compartilhar (□↑)
3. Role para baixo e toque em "Adicionar à Tela de Início"
4. Toque em "Adicionar"
5. O ícone aparecerá na tela inicial do seu iPhone

### Primeiro Acesso

1. Acesse o link fornecido pelos pesquisadores:
   - **Desenvolvimento**: https://3000-ijj5wne4oyffd5f0t9mxw-58e807d3.manusvm.computer/participant/login
   - **Após publicação**: https://seu-projeto.manus.space/participant/login
2. Digite seu número de identificação (fornecido pelos pesquisadores)
3. Clique em "Entrar"

### Uso Diário

#### Horário de Acesso
- O aplicativo funciona apenas das **10h às 18h**
- Fora deste horário, você verá uma mensagem de restrição

#### Navegação
- O aplicativo mostra automaticamente o dia atual baseado na data de início
- Você só pode acessar o dia atual (não é possível navegar para outros dias)
- O dia atual é calculado automaticamente: Dia 1 = primeiro dia, Dia 2 = segundo dia, etc.

#### Vídeo de Boas-Vindas
- No primeiro acesso, assista ao vídeo de introdução
- Você pode rever o vídeo a qualquer momento clicando em "Assistir Vídeo"

#### Grupo Intervenção - Áudios
1. Um player de áudio será exibido
2. Clique em ▶ para iniciar
3. **Importante:**
   - Não é possível acelerar o áudio
   - Não é possível pular partes do áudio
   - Seu progresso é salvo automaticamente
   - O sistema registra quantos % você escutou

#### Grupo Controle - Informações
1. Leia atentamente as informações exibidas
2. Siga as instruções fornecidas

#### Questionário Diário
1. **Bem-Estar**: Selecione uma das 5 carinhas que representa como você está se sentindo
   - 😢 Muito Triste
   - 😟 Triste
   - 😐 Neutro
   - 🙂 Feliz
   - 😄 Muito Feliz

2. **Atividade Atual**: Descreva brevemente o que você está fazendo no momento
   - Ex: "Estudando", "Trabalhando no hospital", "Descansando"

3. Clique em "Enviar Resposta"
4. Você só pode responder uma vez por dia

### Funcionamento Offline

#### Como Funciona
- O aplicativo funciona mesmo sem internet
- Suas respostas são salvas no celular
- Quando você conectar à internet, os dados são sincronizados automaticamente

#### Indicadores
- **Online**: Badge verde com ícone de Wi-Fi
- **Offline**: Badge cinza com ícone de Wi-Fi cortado
- **Dados Pendentes**: Alerta amarelo informando que há dados para sincronizar

#### Recomendações
- Conecte-se à internet pelo menos uma vez por dia
- Verifique se os dados foram sincronizados (o alerta amarelo desaparece)
- Não desinstale o aplicativo antes de sincronizar

### Logout
- Clique no ícone de saída (↗) no canto superior direito
- Faça login novamente com seu número quando quiser retornar

## Perguntas Frequentes

### Para Administradores

**P: Posso ver qual participante está em qual grupo?**
R: Sim, no painel admin você pode ver os grupos. Mantenha sigilo para garantir a validade da pesquisa.

**P: Posso mudar o grupo de um participante?**
R: Atualmente não. A randomização é feita automaticamente no momento do cadastro.

**P: Como faço backup dos dados?**
R: Exporte regularmente os relatórios em CSV. Recomenda-se exportar semanalmente.

**P: Os dados são seguros?**
R: Sim, os dados são armazenados em banco de dados seguro na nuvem com backup automático.

### Para Participantes

**P: Esqueci meu número de identificação, o que faço?**
R: Entre em contato com os pesquisadores responsáveis.

**P: Posso usar o aplicativo fora do horário permitido?**
R: Não, o acesso é restrito das 10h às 18h por design da pesquisa.

**P: E se eu perder a conexão enquanto estou usando?**
R: Não há problema! O aplicativo salva tudo localmente e sincroniza quando você voltar online.

**P: Posso voltar e mudar minha resposta?**
R: Não, cada dia permite apenas uma resposta.

**P: O que acontece se eu pular um dia?**
R: Se você não acessar o aplicativo em um dia, esse dia será perdido. Quando você voltar, o aplicativo mostrará o dia atual (baseado na data), e você não poderá voltar para responder dias anteriores. Por isso, é importante acessar diariamente.

## Suporte Técnico

Para problemas técnicos ou dúvidas:
- Entre em contato com a equipe de pesquisa
- Forneça seu número de participante (se aplicável)
- Descreva o problema com detalhes

## Especificações Técnicas

- **Tipo**: Progressive Web App (PWA)
- **Compatibilidade**: Chrome, Safari, Firefox, Edge (versões recentes)
- **Sistemas**: Android 5+, iOS 11.3+
- **Armazenamento Offline**: LocalStorage + Service Worker
- **Sincronização**: Automática quando online
- **Segurança**: HTTPS, autenticação por número único
