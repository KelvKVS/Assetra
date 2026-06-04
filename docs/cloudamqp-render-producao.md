# CloudAMQP + Render — mensageria em produção (Assetra)

Guia para ligar o **RabbitMQ na nuvem** (CloudAMQP / LavinMQ) ao **Render** (`assetra-backend` + `assetra-events-worker`).

> **LavinMQ não mostra “logs de aplicação”.** É normal a secção de logs estar vazia. O que importa: **Connections**, **Queues** e **Message rates** quando o Assetra publica eventos.

---

## 1. O que precisa existir no Render

| Serviço Render | Comando | Precisa de `RABBITMQ_URL`? |
|----------------|---------|----------------------------|
| **assetra-backend** (Web) | `npm run start` | **Sim** — publica mensagens |
| **assetra-events-worker** (Worker) | `npm run worker:events` | **Sim** — consome mensagens |

Se só configurou a URL no backend e **esqueceu o worker**, as filas no CloudAMQP ficam vazias ou as mensagens acumulam sem consumo.

No dashboard Render: **Dashboard → seu blueprint → dois serviços** (Web + Background Worker). O worker deve estar **Live**, não *Failed*.

---

## 2. Copiar a URL correta do CloudAMQP

1. Entre em [CloudAMQP](https://www.cloudamqp.com/) → instância **Assetra**.
2. Abra **Details** (ou **AMQP Details**).
3. Copie a URL que começa com **`amqps://`** (produção) — **não** use URL HTTP da API.
4. Formato típico:

```text
amqps://USUARIO:SENHA@HOSTNAME/VHOST
```

5. Se a senha tiver caracteres especiais (`@`, `#`, `%`), use a URL já **encoded** que o painel fornece (botão *Copy AMQP URL*), ou encode manualmente.

---

## 3. Configurar variáveis no Render (os dois serviços)

Para **assetra-backend** e **assetra-events-worker**, em **Environment**:

| Variável | Valor |
|----------|--------|
| `EVENT_BROKER_DRIVER` | `rabbitmq` |
| `RABBITMQ_URL` | Cole a URL `amqps://...` do CloudAMQP |
| `NOTIFICATION_EMAILS_ENABLED` | `true` |
| `EMAIL_FROM` | seu e-mail verificado |
| `RESEND_API_KEY` ou `BREVO_API_KEY` | (e-mail no worker; Render free bloqueia SMTP) |

**Importante:** `RABBITMQ_URL` com `sync: false` no `render.yaml` **não preenche sozinha** — você **cola no painel** após criar a instância CloudAMQP.

Depois: **Manual Deploy** (ou *Clear build cache & deploy*) em **ambos** os serviços.

---

## 4. Validar em 30 segundos (sem localhost)

### 4.1 Health da API

No browser ou PowerShell:

```text
https://assetra-44la.onrender.com/api/health
```

Procure no JSON:

```json
"eventBus": {
  "enabled": true,
  "status": "up",
  "driver": "rabbitmq"
}
```

| `eventBus.status` | Significado |
|-------------------|-------------|
| `"up"` | API ligou ao CloudAMQP |
| `"down"` | URL errada, firewall ou broker inacessível |
| `"disabled"` | `RABBITMQ_URL` vazio no **backend** |

### 4.2 Logs do worker no Render

Render → **assetra-events-worker** → **Logs**.

**Sucesso** (deve aparecer após deploy):

```text
[events-worker] Ligado ao RabbitMQ (CloudAMQP).
[events-worker] Filas ativas: assetra.events.audit assetra.notifications.email
```

**Falha comum:**

```text
[events-worker] RABBITMQ_URL não configurado.
```

ou erro `ACCESS_REFUSED` / `ENOTFOUND` → URL ou vhost incorretos.

### 4.3 O que ver no LavinMQ (CloudAMQP)

Abra a instância → interface **LavinMQ**:

| Separador | O que deve aparecer quando está OK |
|-----------|-------------------------------------|
| **Connections** | 1–2 conexões (API + worker) após deploy |
| **Queues** | `assetra.notifications.email`, `assetra.events.audit` (criadas pelo worker) |
| **Overview / Message rates** | Picos ao aprovar solicitação (se notificações ativas) |

**Não procure “Logs” de texto** — use **Connections** e **Queues**.

---

## 5. Disparar uma mensagem real (produção)

1. Abra o frontend: https://assetra-seven.vercel.app  
2. Login como **gestor** → **Aprovações** → **Aprovar** ou **Reprovar** uma solicitação pendente.  
3. Isto chama `dispatchApprovalDecidedEmail` → publica `notification.email` no RabbitMQ.

**Render → assetra-backend → Logs** — procure:

```json
{"event":"event_bus.published","driver":"rabbitmq","routingKey":"notification.email"}
```

**Render → assetra-events-worker → Logs** — procure:

```json
{"event":"event_bus.consumed","eventType":"notification.email","to":"..."}
```

**LavinMQ → Queues → `assetra.notifications.email`** — *Ready* pode subir e descer; *Deliver* aumenta quando o worker processa.

---

## 6. Problemas frequentes

### “Não há nenhum log no LavinMQ”

- LavinMQ **não é log de app**; veja **Connections** (há clientes ligados?) e **Queues** (existem as filas `assetra.*`?).
- Se **Connections = 0**: `RABBITMQ_URL` não está no Render ou deploy falhou.

### Worker *Failed* / reinicia sempre

- Confirme `RABBITMQ_URL` no **worker** (não só no backend).
- Plano free CloudAMQP: limite de conexões — feche conexões antigas ou use só API + 1 worker.

### `eventBus.status: "down"` no health

- URL inválida ou plano CloudAMQP suspenso.
- Teste a mesma URL num redeploy; evite espaços/aspas extras ao colar no Render.

### Mensagem publicada mas e-mail não chega

- RabbitMQ pode estar OK; o problema passa a ser **Resend/Brevo** no worker.
- Ver logs do worker: `[events-worker] E-mail de notificação não enviado`.

### Só quero evidência da Entrega 4 (sem e-mail)

- Basta **publicar + consumir**: aprovar solicitação + prints dos logs Render + print **Connections/Queues** no LavinMQ.
- Eventos `approval.created` também vão para a fila de auditoria (`#`).

---

## 7. Checklist rápido

- [ ] URL `amqps://...` copiada do CloudAMQP  
- [ ] `RABBITMQ_URL` no **assetra-backend**  
- [ ] `RABBITMQ_URL` no **assetra-events-worker**  
- [ ] `EVENT_BROKER_DRIVER=rabbitmq` nos dois  
- [ ] Redeploy dos dois serviços  
- [ ] `/api/health` → `eventBus.status: "up"`  
- [ ] Worker logs → “Filas ativas”  
- [ ] LavinMQ → Connections ≥ 1, Queues `assetra.*`  
- [ ] Aprovar pedido na app → logs `published` + `consumed`  

---

## 8. Entrega 4 só com produção

Use:

- Prints **Render Logs** (backend + worker) com `event_bus.published` / `consumed`  
- Print **LavinMQ → Connections + Queues**  
- Print **`/api/health`** com `eventBus.up`  
- Prints **IAM** na API de produção (401/403) — ver [entrega-4-iam-mensageria-orquestracao.md](entrega-4-iam-mensageria-orquestracao.md) substituindo `localhost:3000` pela URL Render  

Legenda exemplo: _“Em produção, a API Render publica no exchange CloudAMQP e o worker Background consome a fila `assetra.notifications.email`.”_
