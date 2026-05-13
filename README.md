# 🍽️ Ecossistema Móvel: Restaurante Norton & MyNorton

**Projeto e Desenvolvimento Informático (2025/2026)** **Licenciatura em Informática de Gestão - Coimbra Business School | ISCAC**

---

## 👥 Equipa de Desenvolvimento

- **João Francisco Lucas Santos** (Nº 2021133581)
- **Rafael José Pascoal Amoedo** (Nº 2023138007)

---

## 📌 Sobre o Projeto

Este repositório contém o código-fonte do ecossistema móvel desenvolvido para o **Restaurante Norton**. O projeto é composto por duas aplicações móveis distintas que comunicam em tempo real através de uma base de dados centralizada (Supabase):

1.  **Restaurante Norton (App Cliente):** Focada na maximização da experiência do utilizador, permitindo a consulta de ementas, pedidos de take-away, verificação do estado do restaurante, sistema de fidelização e portal de avaliações.
2.  **MyNorton (App Gestão/Admin):** Ferramenta de *back-office* exclusiva para a gerência, permitindo o controlo em tempo real das ementas, gestão de pedidos, horários, lotação do espaço e validação do sistema de fidelização.

---

## ✨ Funcionalidades Principais

### 📱 App Cliente (Restaurante Norton)
- **Perfil Dinâmico e Personalizado:** Gestão de dados pessoais (com integração de foto de perfil), preferências de notificações e persistência do tema visual (Claro/Escuro) na base de dados.
- **Ementa Inteligente e Estado em Tempo Real:** Consulta da ementa semanal com deteção automática de dias de encerramento, períodos de férias e indicação da taxa de ocupação do espaço.
- **Pedidos de Take-Away:** Sistema integrado para encomendar refeições, com escolha de horários de recolha e cálculo automático de totais.
- **Ecossistema de Fidelização:** Acumulação de pontos (1€ = 1pt) através de QR Code dinâmico, consulta de saldo em tempo real e uma "Carteira de Vouchers" para resgate de prémios com aviso de irreversibilidade.
- **Portal de Avaliações:** Sistema para os clientes deixarem críticas e classificações (1 a 5 estrelas) com atalhos para plataformas externas (Google/TripAdvisor).

### ⚙️ App Gestão (MyNorton)
- **Painel de Controlo Geral:** Alteração imediata do estado do restaurante (aberto/encerrado/férias), configuração do horário (via JSON) e atualização da taxa de ocupação.
- **Gestor de Ementas e Pratos:** Criação de novos pratos na base de dados (imagem, preço e categoria) e alocação aos dias da semana.
- **Gestão de Take-Away:** Receção e monitorização do estado dos pedidos em tempo real.
- **Motor de Fidelização:** Leitura de QR Code para atribuição de pontos e validação de vouchers diretamente na caixa.

---

## 🗄️ Estrutura da Base de Dados (Supabase)

A arquitetura relacional foi desenhada para garantir sincronização instantânea via Realtime Engine:

- `perfis`: Dados dos utilizadores, incluindo `tema_escuro`, `foto_url` e preferências de notificações.
- `restaurante`: Configurações globais (horários em JSON, estado de férias e ocupação).
- `pratos` e `ementas`: Catálogo de produtos e calendarização semanal.
- `pedidos`: Registo de encomendas de take-away vinculadas ao cliente.
- `pontos`, `vouchers` e `log_pontos`: Trindade do sistema de fidelização (Saldo, Recompensas e Histórico).
- `criticas`: Armazenamento de feedbacks e pontuações dos clientes.

---

## 🚀 Como Correr o Projeto Localmente

⚠️ **Aviso:** Este projeto é composto por **duas aplicações separadas**. O processo abaixo deve ser repetido para a pasta **restaurante-norton-app** e para a pasta da **mynorton-admin-app**.

## Pré-requisitos
- Node.js instalado.
- App **Expo Go** instalada no smartphone.
- **Keys do Supabase:** As keys do Supabase encontram-se na documentação da **Atividade 3**, podendo também ser solicitadas ao professor da cadeira ou aos autores do projeto.
- **Conta de Teste Admin:** As credenciais para a app MyNorton encontram-se na documentação da **Atividade 3**, podendo também ser solicitadas ao professor da cadeira ou aos autores do projeto.

## 1. Clonar e Instalar
Abre o teu terminal e executa os seguintes comandos para transferir o código e instalar as dependências:

### Clona o repositório
```bash
git clone https://github.com/teu-utilizador/teu-repositorio.git
```

### Entra na pasta da aplicação que queres testar (App Cliente ou Admin)

```bash
cd teu-repositorio/restaurante-norton-app
cd teu-repositorio/mynorton-admin-app
```

### Instala as dependências
```bash
npm install
```


## 2. Configuração do Backend
Garante que altera o nome do ficheiro `.exemploLeys` para `.env` e que coloca a `SUPABASE_URL` e a `SUPABASE_ANON_KEY` corretas do projeto.

## 3. Executar a Aplicação
Para iniciar o servidor de desenvolvimento, utiliza o comando:
```bash
npx expo start
```

## 4. Ligar ao Dispositivo
1. Abre a app **Expo Go** no teu telemóvel.
2. Faz scan do **QR Code** que aparece no terminal (Android) ou utiliza a câmara para detetar o link (iOS).

---

### 📄 Licença
Este projeto foi desenvolvido para fins estritamente académicos no âmbito da unidade curricular de **Projeto e Desenvolvimento Informático**.
