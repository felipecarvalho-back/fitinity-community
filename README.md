# 🏋️ Fitinity Community API

API RESTful completa desenvolvida em **Node.js** com **Express**, autenticação **JWT**, upload e validação de imagens com **Multer**, e persistência de dados em banco de dados relacional **MySQL / MariaDB**. O projeto dá suporte às funcionalidades da comunidade fitness **Fitinity Community** e conta com documentação interativa via **Swagger/OpenAPI** e um **Frontend de Testes Integrado**.

---

## 📋 Sumário

- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Modelagem do Banco de Dados](#-modelagem-do-banco-de-dados)
- [Pré-requisitos e Instalação](#-pré-requisitos-e-instalação)
- [Configuração de Variáveis de Ambiente](#-configuração-de-variáveis-de-ambiente)
- [Executando a Aplicação](#-executando-a-aplicação)
- [Documentação da API e Testes](#-documentação-da-api-e-testes)
  - [Painel Web de Testes](#-painel-web-de-testes)
  - [Swagger / OpenAPI](#-swagger--openapi)
  - [Postman / Insomnia](#-postman--insomnia)
  - [Testes Automatizados](#-testes-automatizados)
- [Endpoints da API](#-endpoints-da-api)
- [Demonstração dos Requisitos Obrigatórios (Avaliação)](#-demonstração-dos-requisitos-obrigatórios-avaliação)
- [Boas Práticas de Segurança Implementadas](#-boas-práticas-de-segurança-implementadas)

---

## 🚀 Tecnologias Utilizadas

| Tecnologia | Finalidade |
|---|---|
| **Node.js** | Ambiente de execução JavaScript no servidor |
| **Express.js** | Framework web para roteamento e middlewares REST |
| **MySQL / MariaDB** | Banco de dados relacional com integridade referencial (`ON DELETE CASCADE`) |
| **JWT (`jsonwebtoken`)** | Autenticação stateless baseada em tokens com expiração configurável |
| **bcrypt (`bcryptjs`)** | Criptografia com salt rounds para hash seguro de senhas |
| **Multer** | Middleware para processamento de upload em `multipart/form-data` |
| **Swagger UI (`swagger-ui-express`)** | Documentação interativa e navegável dos endpoints |
| **Cors & Dotenv** | Segurança de requisições cross-origin e gestão de configurações por ambiente |

---

## 📂 Estrutura do Projeto

O projeto segue uma arquitetura modular em camadas, separando responsabilidades e facilitando manutenção e testes:

```text
AtividadePW/
├── database/
│   └── schema.sql                  # Script DDL com a modelagem do banco de dados
├── public/                         # Frontend de testes e recursos estáticos
│   ├── index.html                  # Interface de testes visuais e cenários do PDF
│   ├── style.css                   # Estilização responsiva em tema fitness escuro
│   ├── app.js                      # Cliente de teste, console HTTP e chamadas fetch
│   └── Fitinity_Community_API.postman_collection.json # Coleção pronta do Postman
├── src/
│   ├── config/
│   │   ├── database.js             # Pool de conexão MySQL e auto-inicialização de tabelas
│   │   └── swagger.js              # Especificação OpenAPI 3.0 e Swagger UI
│   ├── controllers/
│   │   ├── auth.controller.js      # Cadastro e autenticação de usuários
│   │   ├── user.controller.js      # Gerenciamento de perfil e fotos de perfil
│   │   ├── post.controller.js      # CRUD de publicações e curtidas
│   │   └── comment.controller.js   # CRUD e validação de comentários
│   ├── middlewares/
│   │   ├── auth.middleware.js      # Validação de token JWT Bearer e rotas protegidas
│   │   ├── upload.middleware.js    # Validação de formato/tamanho de arquivos e exclusão segura
│   │   └── error.middleware.js     # Tratamento centralizado de erros e 404
│   ├── routes/
│   │   ├── auth.routes.js          # /api/auth (register, login)
│   │   ├── user.routes.js          # /api/users (me, me/avatar)
│   │   ├── post.routes.js          # /api/posts (posts, likes, comentários)
│   │   └── comment.routes.js       # /api/comments
│   ├── app.js                      # Configuração do Express, middlewares globais e rotas
│   └── server.js                   # Ponto de entrada, inicialização do banco e escuta HTTP
├── tests/
│   └── test-api.js                 # Bateria de testes automatizados dos 10 itens do PDF
├── uploads/                        # Armazenamento de arquivos enviados
│   ├── avatars/                    # Imagens de perfil
│   └── posts/                      # Imagens das publicações
├── .env.example                    # Modelo seguro de variáveis de ambiente
├── .gitignore                      # Proteção para não versionar .env e arquivos de upload
├── package.json                    # Dependências e scripts de inicialização
└── README.md                       # Documentação completa do projeto
```

---

## 🗄️ Modelagem do Banco de Dados

A persistência é gerenciada com 4 tabelas inter-relacionadas com restrições de integridade e chaves estrangeiras com ação em cascata:

1. **`users`**:
   - `id`: Chave primária auto-incrementada.
   - `name`: Nome do usuário (VARCHAR 120).
   - `email`: E-mail único (VARCHAR 150, UNIQUE).
   - `password_hash`: Hash da senha gerado por bcrypt (VARCHAR 255).
   - `bio`: Biografia do perfil (VARCHAR 255, opcional).
   - `avatar_url`: Caminho para a imagem de avatar (VARCHAR 255, opcional).
   - `created_at` / `updated_at`: Timestamps automáticos.

2. **`posts`**:
   - `id`: Chave primária auto-incrementada.
   - `user_id`: Chave estrangeira referenciando `users(id)` com `ON DELETE CASCADE`.
   - `content`: Texto da publicação (TEXT).
   - `image_url`: Imagem opcional da publicação (VARCHAR 255).
   - `created_at` / `updated_at`: Timestamps automáticos.

3. **`likes`**:
   - `id`: Chave primária auto-incrementada.
   - `user_id`: Chave estrangeira para `users(id)` (`ON DELETE CASCADE`).
   - `post_id`: Chave estrangeira para `posts(id)` (`ON DELETE CASCADE`).
   - `created_at`: Timestamp da curtida.
   - **`UNIQUE KEY (user_id, post_id)`**: Garante que o mesmo usuário não curta o mesmo post mais de uma vez.

4. **`comments`**:
   - `id`: Chave primária auto-incrementada.
   - `user_id`: Chave estrangeira para `users(id)` (`ON DELETE CASCADE`).
   - `post_id`: Chave estrangeira para `posts(id)` (`ON DELETE CASCADE`).
   - `content`: Conteúdo do comentário (TEXT).
   - `created_at` / `updated_at`: Timestamps automáticos.

> 💡 **Nota:** Ao iniciar a aplicação com `npm start` ou `npm run dev`, as tabelas são verificadas e criadas automaticamente caso ainda não existam. O script SQL completo também está disponível em [database/schema.sql](file:///home/kiyoshi/AtividadePW/database/schema.sql).

---

## ⚙️ Pré-requisitos e Instalação

### Pré-requisitos:
- **Node.js** (v18 ou superior)
- **MySQL** ou **MariaDB** instalado e em execução

### Instalação:
1. Clone ou acesse o diretório do projeto:
   ```bash
   cd AtividadePW
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```

---

## 🔐 Configuração de Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Ajuste as configurações no `.env` conforme o seu ambiente local:

```env
PORT=3000
NODE_ENV=development

# Configuração do Banco de Dados
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=fitinity
DB_PASSWORD=fitinity123
DB_NAME=fitinity_community

# Chave secreta JWT e validade
JWT_SECRET=fitinity_super_secret_jwt_token_key_2026_pw
JWT_EXPIRES_IN=24h

# Uploads
MAX_FILE_SIZE_MB=5
BASE_URL=http://localhost:3000
```

---

## 🏃 Executando a Aplicação

### Modo de Produção:
```bash
npm start
```

### Modo de Desenvolvimento (com reload automático via nodemon):
```bash
npm run dev
```

Após iniciar, o terminal exibirá:
```text
🚀 Fitinity Community API rodando na porta 3000
📌 Documentação Swagger: http://localhost:3000/api/docs
💻 Frontend de Testes:  http://localhost:3000/
⚡ Healthcheck:          http://localhost:3000/api/health
```

---

## 🧪 Documentação da API e Testes

### 💻 Painel Web de Testes
O projeto inclui uma interface web integrada para testes visuais em:
👉 **[http://localhost:3000/](http://localhost:3000/)**

Principais recursos do painel:
- **Botões de Demonstração Rápida (Item 10 do PDF)**: Testa com 1 clique e-mail duplicado (409), login inválido (401), rota privada sem token (401), alteração indevida de post alheio (403) e upload de formato inválido (400).
- **Alternador de Usuários (Usuário A e Usuário B)**: Permite alternar rapidamente de usuário para testar restrições de permissão entre contas.
- **Console de Inspeção HTTP em Tempo Real**: Exibe o método, status HTTP, tempo de resposta e o JSON retornado pela API.
- **Feed Interativo**: Permite criar publicações com ou sem fotos, curtir/descurtir, comentar e editar/excluir posts próprios.

### 📖 Swagger / OpenAPI
A documentação interativa gerada com Swagger UI está acessível em:
👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

Você pode testar qualquer endpoint diretamente pelo navegador, informando o token no botão **Authorize** (`Bearer <token>`).

### 📥 Postman / Insomnia
Uma coleção completa e pré-configurada está disponível para importação:
- Baixe diretamente do navegador em: `http://localhost:3000/Fitinity_Community_API.postman_collection.json`
- Ou importe o arquivo local: `public/Fitinity_Community_API.postman_collection.json`
- A coleção salva o token JWT automaticamente na variável de coleção após a requisição de login.

### 🧪 Testes Automatizados (CLI)
Para rodar a suíte completa de testes de integração via terminal:
```bash
npm test
```
Este script testa 26 cenários de ponta a ponta e valida todas as regras de negócio e códigos HTTP.

---

## 📡 Endpoints da API

### Autenticação (`/api/auth`)
| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Cadastra um novo usuário | Não |
| `POST` | `/api/auth/login` | Realiza login e retorna token JWT | Não |

### Perfil do Usuário (`/api/users`)
| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/users/me` | Retorna dados e estatísticas do usuário autenticado | Sim (JWT) |
| `PATCH` | `/api/users/me` | Atualiza nome, bio ou senha | Sim (JWT) |
| `POST` | `/api/users/me/avatar` | Envia ou substitui foto de perfil (máx 2MB) | Sim (JWT) |
| `DELETE` | `/api/users/me/avatar` | Remove a foto de perfil do usuário e do disco | Sim (JWT) |

### Publicações (`/api/posts`)
| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/posts` | Lista publicações com autor, likes e comentários | Opcional |
| `GET` | `/api/posts/:id` | Consulta publicação específica e seus comentários | Opcional |
| `POST` | `/api/posts` | Cria nova publicação com imagem opcional (máx 5MB) | Sim (JWT) |
| `PATCH` | `/api/posts/:id` | Edita texto/imagem de publicação própria | Sim (JWT - Dono) |
| `DELETE` | `/api/posts/:id` | Exclui publicação própria e seu arquivo do disco | Sim (JWT - Dono) |

### Interações (`/api/posts/:id/likes` & `/api/posts/:id/comments`)
| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `POST` | `/api/posts/:id/likes` | Curte uma publicação (impede curtida duplicada) | Sim (JWT) |
| `DELETE` | `/api/posts/:id/likes` | Remove curtida de uma publicação | Sim (JWT) |
| `GET` | `/api/posts/:id/comments` | Lista todos os comentários de uma publicação | Não |
| `POST` | `/api/posts/:id/comments` | Adiciona comentário a uma publicação | Sim (JWT) |
| `PATCH` | `/api/comments/:id` | Edita comentário próprio | Sim (JWT - Dono) |
| `DELETE` | `/api/comments/:id` | Exclui comentário próprio | Sim (JWT - Dono) |

---

## 🎯 Demonstração dos Requisitos Obrigatórios (Avaliação)

Conforme a seção **10. Demonstração obrigatória** do PDF:

1. **Cadastrar usuário e testar e-mail duplicado**:
   - `POST /api/auth/register` com dados novos -> retorna `201 Created`.
   - `POST /api/auth/register` com mesmo e-mail -> retorna `409 Conflict` com mensagem explicativa.
2. **Login com credenciais válidas e inválidas**:
   - Credenciais corretas -> retorna `200 OK` e o JWT.
   - Senha incorreta -> retorna `401 Unauthorized` ("Credenciais inválidas").
3. **Acessar rota privada com e sem token**:
   - `GET /api/users/me` sem cabeçalho -> retorna `401 Unauthorized`.
   - `GET /api/users/me` com `Authorization: Bearer <token>` -> retorna `200 OK`.
4. **Validação de upload de imagem**:
   - Arquivo `.txt` enviado no lugar de imagem -> retorna `400 Bad Request` com erro de MIME type.
   - Arquivo de imagem válido (JPEG, PNG, WEBP, GIF) -> aceito e salvo na pasta `uploads/`.
5. **CRUD de Publicações**:
   - Criação (`POST`), listagem (`GET`), consulta detalhada (`GET /:id`), edição (`PATCH /:id`) e exclusão (`DELETE /:id`).
6. **Controle de Propriedade (403 Forbidden)**:
   - Se o Usuário A tentar editar ou excluir publicação ou comentário do Usuário B, a API bloqueia a requisição retornando `403 Forbidden`.
7. **Testes pelo Postman/Swagger**:
   - Documentação Swagger ativa em `/api/docs` e arquivo Postman collection disponível.

---

## 🔒 Boas Práticas de Segurança Implementadas

- **Hash de Senha**: Senhas nunca são salvas ou comparadas em texto puro, utilizando `bcrypt` com `saltRounds = 10`.
- **Tokens com Expiração**: Tokens JWT assinados com chave secreta em variável de ambiente e prazo de expiração (`24h`).
- **Validação de Arquivos no Multer**: Verificação tanto por tipo MIME quanto por extensão de arquivo permitida, além de limite rígido de tamanho (`limits.fileSize`).
- **Prevenção de Arquivos Órfãos**: Ao substituir ou excluir um avatar ou publicação, a imagem anterior é automaticamente removida do disco (`fs.promises.unlink`).
- **Proteção contra Path Traversal**: Validação de caminhos de arquivos restritos ao diretório raiz de `uploads/`.
- **Variáveis de Ambiente**: Arquivo `.env` ignorado no `.gitignore` para não expor credenciais reais no repositório.
