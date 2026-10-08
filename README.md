# Chat FIAP

Aplicativo de chat em **React Native (Expo) + TypeScript**, com conversas individuais e em grupo, mensagens em tempo real via Firebase Realtime Database, perfis e metadados no Cloud Firestore, autenticação por e-mail/senha e notificações push enviadas por uma API própria (Node.js + Express) usando o Expo Push Service.

## Integrantes

- RM556289 — Gustavo Coelho
- RM555177 - Matheus Alves
- RM559098 - Gustavo Atanazio
- RM558023 - Dayana Quispe
- RM556617 - Nicolas Aquino

---

## Tecnologias utilizadas

**App mobile**

- React Native 0.86 + Expo SDK **57**
- TypeScript
- Expo Router não é usado — navegação com `@react-navigation/native` (native stack)
- Firebase JS SDK (Authentication, Firestore, Realtime Database)
- `expo-notifications`, `expo-image-picker`, `expo-device`
- Cloudinary (upload de imagens)

**API de notificações (`server/`)**

- Node.js + Express 5 + TypeScript
- Firebase Admin SDK (Authentication, Firestore, Realtime Database)
- Expo Push Service (`https://exp.host/--/api/v2/push/send`)

---

## Serviços Firebase utilizados

| Serviço                                          | Responsabilidade no projeto                                                                                                                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Firebase Authentication**                      | Cadastro e login exclusivamente por e-mail/senha, recuperação de sessão, identificação do usuário pelo `uid`, logout.                                                                                                      |
| **Cloud Firestore**                              | Perfis dos usuários (`users/{uid}`), dados privados (`users/{uid}/private/data`), tokens de dispositivo (`users/{uid}/devices/{deviceId}`), grupos (`groups/{id}`) e conversas diretas (`directConversations/{id}`).       |
| **Firebase Realtime Database**                   | Mensagens de todas as conversas (`messages/{conversationId}/{messageId}`), com sincronização em tempo real via listeners, e espelho de integrantes (`conversationMembers/{conversationId}`) usado nas regras de segurança. |
| **Firebase Cloud Messaging / Expo Push Service** | Envio das notificações push pela API própria (nunca pelo app), calculando destinatários conforme a política da conversa.                                                                                                   |

---

## Estrutura do projeto

```text
chat-fiap/
├── App.tsx                  # Navegação raiz (autenticado vs. não autenticado)
├── firebaseConfig.json      # Config pública do Firebase SDK (cliente)
├── .env.example             # Variáveis do app (EXPO_PUBLIC_*)
├── rules/
│   ├── firestore.rules
│   └── database.rules.json
├── src/
│   ├── components/          # ChatMessage, ChatInput, ConversationItem, Avatar, Loading, ErrorMessage...
│   ├── screens/              # Login, Register, Conversations, Users, GroupForm, Chat, Profile
│   ├── services/              # firebase(.web).ts, authService, userService, groupService, chatService,
│   │                           # notificationService, imageService, apiClient
│   ├── hooks/                 # useAuth, useChat, useGroups, useNotifications
│   ├── contexts/               # AuthContext
│   ├── types/                   # user, chat, group, notification
│   └── utils/                    # conversationId, groupValidation, validation, errors
└── server/
    ├── .env.example           # Variáveis da API (FIREBASE_*)
    └── src/
        ├── app.ts
        ├── middleware/authenticate.ts
        ├── routes/conversations.ts, groups.ts, notifications.ts
        └── services/firebaseAdmin.ts, notificationSender.ts, recipientResolver.ts, contacts.ts
```

---

## Instalação e execução — App mobile

Pré-requisitos: Node.js, [Expo CLI via `npx`], um dispositivo físico ou emulador, e o app **Expo Go** (ou um development build, necessário para push notifications).

```bash
npm install
cp .env.example .env     # preencha EXPO_PUBLIC_API_URL e EXPO_PUBLIC_CLOUDINARY_*
npx expo start
```

Variáveis de ambiente do app (`.env`, ver [.env.example](.env.example)):

| Variável                               | Descrição                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`                  | URL pública da API de notificações (ver seção [API online](#api-online-de-notificações)). |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME`    | Cloud name da conta Cloudinary usada para upload de fotos.                                |
| `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Upload preset (unsigned) do Cloudinary.                                                   |

> Push notifications não funcionam no Expo Go para todos os cenários — quando necessário, gere um development build (`npx expo run:android` / `npx expo run:ios` ou `eas build --profile development`).

---

## Configuração do Firebase

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. Ative **Authentication → Sign-in method → E-mail/senha**.
3. Crie um **Realtime Database** e um **Cloud Firestore** (modo produção).
4. Em **Configurações do projeto → Seus apps**, registre um app **Web** e copie os valores para o arquivo [firebaseConfig.json](firebaseConfig.json) (já versionado neste repositório, pois contém apenas a configuração pública do SDK cliente — **não concede privilégios administrativos**).
5. Publique as regras de segurança descritas em [regras do firestore e do realtime database](#regras-do-firestore-e-do-realtime-database).

---

## Armazenamento de fotos — Cloudinary

As fotos de perfil e de grupo são enviadas para o **Cloudinary** (upload não-assinado, via `upload_preset`). Apenas a `secure_url` retornada é salva no Firestore — nenhuma imagem é guardada em Base64.

Configuração:

1. Crie uma conta gratuita em [cloudinary.com](https://cloudinary.com).
2. No painel, anote o **Cloud name**.
3. Vá em **Settings → Upload** → **Add upload preset** → marque **Unsigned** → salve e anote o nome do preset.
4. Preencha `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` e `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` no `.env` do app.

> **TODO (equipe):** conta Cloudinary ainda não configurada neste ambiente — preencher após criar a conta.

---

## Notificações — configuração Android e iOS

- O plugin `expo-notifications` está habilitado em [app.json](app.json).
- **Android**: o canal de notificação `default` é criado em tempo de execução ([notificationService.ts](src/services/notificationService.ts)); é necessário o arquivo `google-services.json` na raiz do projeto para builds nativos (referenciado em `app.json`, mas **não versionado** por conter identificadores do projeto Firebase — gerar em Firebase Console → Configurações do projeto → seus apps → Android).
- **iOS**: é necessário habilitar **Push Notifications** e **Background Modes → Remote notifications** nas capabilities do app (automaticamente configurado pelo EAS Build a partir do `app.json`), além de um `GoogleService-Info.plist` caso se use FCM nativo diretamente.
- Testes de push só são válidos em **dispositivo físico** (`expo-device` bloqueia o registro em emuladores/simuladores e no navegador).
- Ao tocar na notificação, o app navega para a conversa usando o payload `{ conversationId, conversationType }` (tratado em [useNotifications.ts](src/hooks/useNotifications.ts)).

---

## API online de notificações

Tecnologia: **Node.js + Express + TypeScript**, usando o **Firebase Admin SDK** para validar o usuário autenticado e consultar Firestore/Realtime Database, e o **Expo Push Service** para o envio efetivo.

### Configurar e executar localmente

```bash
cd server
npm install
cp .env.example .env   # preencha com as credenciais da conta de serviço (ver abaixo)
npx tsx src/app.ts
```

### Variáveis de ambiente da API (ver [server/.env.example](server/.env.example))

| Variável                | Descrição                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `PORT`                  | Porta HTTP do servidor.                                                                                            |
| `FIREBASE_PROJECT_ID`         | ID do projeto Firebase.                                                                                            |
| `FIREBASE_CLIENT_EMAIL`       | E-mail da conta de serviço (Firebase Admin SDK).                                                                   |
| `FIREBASE_PRIVATE_KEY_BASE64` | Chave privada da conta de serviço, codificada em base64 (evita que painéis de hospedagem corrompam as quebras de linha) — **configurada somente nas variáveis secretas da hospedagem**, nunca commitada. |
| `FIREBASE_DATABASE_URL`       | URL do Realtime Database.                                                                                          |

> As credenciais administrativas (conta de serviço) **nunca** ficam no app mobile nem no repositório — apenas nas variáveis de ambiente secretas do serviço de hospedagem da API. A API aceita a chave em base64 (`FIREBASE_PRIVATE_KEY_BASE64`, recomendado) ou em texto puro com `\n` escapado (`FIREBASE_PRIVATE_KEY`, fallback).

### Publicar a API

Hospedada no **Render** (Web Service gratuito):

1. **Root Directory**: `server`.
2. **Build Command**: `npm install && npm run build`; **Start Command**: `npm run start` (executa `node --openssl-legacy-provider dist/app.js` — a flag contorna um bug de decodificação de chaves RSA do OpenSSL 3.x em Node 22/24).
3. Variáveis de ambiente configuradas diretamente no painel do serviço (nunca no repositório).
4. `EXPO_PUBLIC_API_URL` no `.env` do app aponta para a URL pública gerada pelo Render.

**URL pública da API:** `https://chat-fiap-api.onrender.com`

> O plano gratuito do Render hiberna o serviço após período de inatividade — a primeira requisição após a hibernação pode demorar ~30s para responder enquanto a instância é religada.

### Endpoints

Todos os endpoints (exceto `/health`) exigem o header `Authorization: Bearer <firebase-id-token>`.

| Método   | Rota                       | Descrição                                                                                                                              |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/health`                  | Health check — retorna `{ ok: true, timestamp }`. Usado para verificar que a API está no ar.                                           |
| `POST`   | `/conversations/direct`    | Cria (ou localiza) a conversa individual entre o usuário autenticado e `otherUid`. Body: `{ otherUid }`.                               |
| `POST`   | `/groups`                  | Cria um grupo. Body: `{ name, photoUrl, memberIds, memberLimit, notificationPolicy }`.                                                 |
| `POST`   | `/groups/:id/members`      | Adiciona um integrante (somente o dono). Body: `{ uid }`. Protegido por transação contra concorrência.                                 |
| `DELETE` | `/groups/:id/members/:uid` | Remove um integrante (o dono remove qualquer um; um membro pode sair sozinho).                                                         |
| `PATCH`  | `/groups/:id`              | Atualiza nome, foto, limite e/ou política de notificação do grupo (somente o dono).                                                    |
| `POST`   | `/notifications/messages`  | Dispara o push de uma mensagem já persistida. Body: `{ conversationId, messageId }`. Idempotente (reenvios não duplicam notificações). |

### Verificar disponibilidade da API

```bash
curl https://<url-publica>/health
# esperado: {"ok":true,"timestamp":1234567890}
```

---

## Política de notificações

Cada grupo possui uma `notificationPolicy`, definida pelo proprietário e aplicada pela API (nunca pelo cliente):

| Política               | Comportamento                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `all_group_messages`   | Toda mensagem geral do grupo notifica todos os integrantes, exceto o remetente.                        |
| `mentioned_members`    | Só notifica integrantes mencionados (`mentionedUserIds`) ou o destinatário direto (`target.memberId`). |
| `direct_messages_only` | Mensagens de grupo nunca notificam; só conversas individuais geram push.                               |
| `disabled`             | Nenhuma mensagem da conversa gera notificação.                                                         |

A resolução dos destinatários é feita inteiramente no servidor ([recipientResolver.ts](server/src/services/recipientResolver.ts)), a partir dos dados do Firestore — o app nunca envia a lista de destinatários. O fluxo completo:

```text
App envia a mensagem → Realtime Database persiste → listeners atualizam a conversa aberta
      → App chama POST /notifications/messages com { conversationId, messageId }
      → API valida o token, confirma que o remetente bate com a mensagem no RTDB
      → API consulta participantes/política no Firestore e calcula destinatários
      → API envia ao Expo Push Service, desativando tokens inválidos (DeviceNotRegistered)
```

A idempotência é garantida por um documento de lock (`notificationLogs/{conversationId}_{messageId}`) criado com `.create()` — reenvios da mesma mensagem retornam `{ sent: 0, skipped: 'duplicate' }` sem notificar novamente.

---

## Proteção do limite de integrantes contra concorrência

O limite (`memberLimit`) é validado em duas camadas:

1. **Interface**: o formulário de grupo impede submeter mais integrantes do que o limite e exibe as vagas restantes (`slotsLeft`, em [groupValidation.ts](src/utils/groupValidation.ts)).
2. **Servidor (camada decisiva)**: `POST /groups/:id/members` executa a leitura do grupo e a inserção do novo integrante dentro de uma **transação do Firestore** (`db.runTransaction`, em [groups.ts](server/src/routes/groups.ts)). A transação relê o documento, verifica `memberIds.length >= memberLimit` e só então aplica `arrayUnion`. Se duas requisições concorrentes tentarem entrar na última vaga, o Firestore reexecuta a transação que perder a corrida, e ela falhará a validação de limite na releitura — garantindo que o grupo nunca ultrapasse `memberLimit`, mesmo sob concorrência.
3. A redução do limite (`PATCH /groups/:id`) é bloqueada quando o novo valor for menor que a quantidade atual de integrantes.

---

## Regras do Firestore e do Realtime Database

Arquivos versionados em [rules/](rules/):

- [rules/firestore.rules](rules/firestore.rules) — perfis (`users/{uid}`) só editáveis pelo próprio dono; dados privados e tokens de dispositivo restritos ao dono; grupos e conversas diretas são somente leitura para o cliente (escrita só pelo Admin SDK da API).
- [rules/database.rules.json](rules/database.rules.json) — leitura/escrita de `messages/{conversationId}` liberada apenas para `uid`s presentes em `conversationMembers/{conversationId}`, que é mantido pela API a cada entrada/saída de integrante.

> **Nota de design:** como os dados de uma mesma conversa estão divididos entre Firestore (metadados/participantes) e Realtime Database (mensagens), validações que dependem dos dois bancos ao mesmo tempo (ex.: limite de integrantes, idempotência do push, conferência de remetente) são executadas pela API com o Admin SDK, que não está sujeito às regras de segurança do cliente.

Publicação das regras: Firebase Console → Firestore Database → **Regras** (colar `firestore.rules`) e Realtime Database → **Regras** (colar `database.rules.json`) → Publicar.

---

## Prints das telas

> **TODO (equipe):** adicionar capturas de tela de Login, Cadastro, Conversas, Usuários, Criar/Editar Grupo, Chat e Perfil nesta seção (ex.: `docs/screenshots/`).

---

## Evidência de notificação recebida

> **TODO (equipe):** adicionar print do dispositivo físico recebendo a notificação push, após o deploy da API e teste em build nativo/dev build.

---

## Checklist de segurança de credenciais

- [x] `firebaseConfig.json` versionado no repositório (apenas config pública do SDK cliente).
- [x] `.env.example` do app e do servidor versionados, sem segredos reais.
- [x] `.env` (app e servidor) e qualquer `serviceAccount*.json` / `firebaseAdmin*.json` ignorados pelo Git ([.gitignore](.gitignore)).
- [x] Credenciais administrativas (`FIREBASE_PRIVATE_KEY_BASE64` etc.) configuradas apenas nas variáveis secretas do Render, nunca no repositório.
